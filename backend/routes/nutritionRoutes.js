import express from 'express';
import { protect } from '../middleware/auth.js';
import NutritionLog from '../models/NutritionLog.js';
import FoodCache from '../models/FoodCache.js';
import FavoriteMeal from '../models/FavoriteMeal.js';
import Profile from '../models/Profile.js';
import { queryNvidiaAI } from '../utils/nvidia.js';

const router = express.Router();

// Helper to convert units to standard multipliers (relative to 100g base)
const getUnitMultiplier = (quantity, unit, wholeWeight = 100) => {
  const lowerUnit = unit.toLowerCase();
  if (lowerUnit === 'g' || lowerUnit === 'gm' || lowerUnit === 'grams') {
    return quantity / 100;
  }
  if (lowerUnit === 'kg') {
    return (quantity * 1000) / 100;
  }
  if (lowerUnit === 'ml' || lowerUnit === 'milliliter' || lowerUnit === 'milliliters') {
    return quantity / 100;
  }
  if (lowerUnit === 'l' || lowerUnit === 'litre' || lowerUnit === 'liter' || lowerUnit === 'liters') {
    return (quantity * 1000) / 100;
  }
  if (lowerUnit === 'whole') {
    return (quantity * wholeWeight) / 100;
  }
  if (lowerUnit === 'piece' || lowerUnit === 'pieces' || lowerUnit === 'nos') {
    return (quantity * wholeWeight) / 100;
  }
  if (lowerUnit === 'slice' || lowerUnit === 'slices') {
    // Slices default to 30g if wholeWeight is default, otherwise use wholeWeight
    const sliceWeight = wholeWeight === 100 ? 30 : wholeWeight;
    return (quantity * sliceWeight) / 100;
  }
  if (lowerUnit === 'bowl' || lowerUnit === 'bowls') {
    return quantity * 3.0;
  }
  if (lowerUnit === 'cup' || lowerUnit === 'cups') {
    return quantity * 2.4;
  }
  if (lowerUnit === 'plate' || lowerUnit === 'plates') {
    return quantity * 4.0;
  }
  if (lowerUnit === 'tbsp' || lowerUnit === 'tablespoon') {
    return quantity * 0.15;
  }
  if (lowerUnit === 'tsp' || lowerUnit === 'teaspoon') {
    return quantity * 0.05;
  }
  if (lowerUnit === 'scoop' || lowerUnit === 'scoops') {
    return quantity * 0.3;
  }
  if (lowerUnit === 'handful') {
    return quantity * 0.3;
  }
  if (lowerUnit === 'serving' || lowerUnit === 'servings') {
    return quantity * 1.0;
  }
  return quantity;
};

// Search Open Food Facts API
const fetchFromOpenFoodFacts = async (name) => {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'AllInOnePlanner - WebApp - Version 1.0' } });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.products || data.products.length === 0) return null;

    const product = data.products.find(p => p.nutriments && p.nutriments['energy-kcal_100g'] !== undefined);
    if (!product) return null;

    const nutriments = product.nutriments;
    return {
      name: product.product_name || name,
      calories: Math.round(Number(nutriments['energy-kcal_100g'] || 0)),
      protein: Math.round(Number(nutriments['proteins_100g'] || 0) * 10) / 10,
      carbs: Math.round(Number(nutriments['carbohydrates_100g'] || 0) * 10) / 10,
      fat: Math.round(Number(nutriments['fat_100g'] || 0) * 10) / 10,
      fiber: Math.round(Number(nutriments['fiber_100g'] || 0) * 10) / 10,
    };
  } catch (error) {
    console.error('Open Food Facts API error:', error);
    return null;
  }
};

// Query NVIDIA AI for nutritional info per 100g (with fiber)
const fetchFromNvidia = async (name) => {
  const systemPrompt = `You are a professional food nutrition analyst. Analyze the nutrient composition of the given food or supplement.
Provide highly accurate nutritional content based on 100g (or 100ml for liquids) standard size.
Also estimate the average weight in grams of a single/whole item of this food (e.g. 1 whole banana, 1 whole egg, 1 whole apple). If it is not a countable/whole food (like flour, butter, protein powder, or cooked dish with no discrete items), set wholeWeight to 100.
Be extremely precise with protein, carbs, fat, and fiber per 100g. Always output ONLY valid JSON. Do not include markdown wraps.`;
  const userPrompt = `Analyze nutrition for "${name}". Return ONLY a JSON object:
  {
    "name": "formatted food name",
    "calories": number (in kcal per 100g),
    "protein": number (in grams per 100g),
    "carbs": number (in grams per 100g),
    "fat": number (in grams per 100g),
    "fiber": number (in grams per 100g),
    "wholeWeight": number (average weight in grams of a single whole item/serving, default to 100 if not applicable)
  }
  Do not return any introductory or concluding text, only the raw JSON.`;

  try {
    return await queryNvidiaAI(systemPrompt, userPrompt, true);
  } catch (error) {
    console.error('NVIDIA nutrition API error:', error);
    throw error;
  }
};

// Rules-based mockup fallback (with fiber)
const getMockNutrients = (name) => {
  const cleanName = name.toLowerCase().trim();
  let calories = 100;
  let protein = 2;
  let carbs = 15;
  let fat = 1;
  let fiber = 0.5;
  let wholeWeight = 100;

  if (cleanName.includes('egg')) {
    calories = 143; protein = 13; carbs = 0.7; fat = 9.5; fiber = 0; wholeWeight = 50;
  } else if (cleanName.includes('chicken') || cleanName.includes('breast')) {
    calories = 165; protein = 31; carbs = 0; fat = 3.6; fiber = 0; wholeWeight = 172;
  } else if (cleanName.includes('rice')) {
    calories = 130; protein = 2.7; carbs = 28; fat = 0.3; fiber = 0.4; wholeWeight = 150;
  } else if (cleanName.includes('dal') || cleanName.includes('lentil')) {
    calories = 116; protein = 9; carbs = 20; fat = 0.4; fiber = 4; wholeWeight = 150;
  } else if (cleanName.includes('roti') || cleanName.includes('chapati')) {
    calories = 260; protein = 8; carbs = 55; fat = 1.5; fiber = 7; wholeWeight = 35;
  } else if (cleanName.includes('paneer') || cleanName.includes('cottage cheese')) {
    calories = 265; protein = 18; carbs = 3; fat = 20; fiber = 0; wholeWeight = 100;
  } else if (cleanName.includes('banana')) {
    calories = 89; protein = 1.1; carbs = 23; fat = 0.3; fiber = 2.6; wholeWeight = 120;
  } else if (cleanName.includes('apple')) {
    calories = 52; protein = 0.3; carbs = 14; fat = 0.2; fiber = 2.4; wholeWeight = 182;
  } else if (cleanName.includes('milk')) {
    calories = 60; protein = 3.2; carbs = 4.8; fat = 3.25; fiber = 0; wholeWeight = 240;
  } else if (cleanName.includes('oats') || cleanName.includes('oatmeal')) {
    calories = 389; protein = 16.9; carbs = 66; fat = 6.9; fiber = 10; wholeWeight = 40;
  }

  return { name, calories, protein, carbs, fat, fiber, wholeWeight };
};

// Main search composition helper
const searchNutritionComposition = async (name) => {
  const searchName = name.toLowerCase().trim();

  // 1. Check Database Cache
  const cachedFood = await FoodCache.findOne({ name: searchName });
  if (cachedFood) {
    return { 
      ...cachedFood.toObject(), 
      source: cachedFood.source || 'cache',
      wholeWeight: cachedFood.wholeWeight || 100 
    };
  }

  // 2. Query NVIDIA AI
  let data = null;
  let source = 'nvidia_ai';

  try {
    data = await fetchFromNvidia(searchName);
    data.wholeWeight = Number(data.wholeWeight) || 100;
  } catch (nvidiaError) {
    console.warn('[NVIDIA Miss] Open Food Facts fallback:', nvidiaError);
    // 3. Fallback to Open Food Facts
    data = await fetchFromOpenFoodFacts(searchName);
    source = 'open_food_facts';

    if (!data) {
      // 4. Fallback to rules dictionary
      data = getMockNutrients(searchName);
      source = 'local_mock';
    } else {
      data.wholeWeight = 100;
    }
  }

  // Cache nutrition details
  try {
    await FoodCache.create({
      name: searchName,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      fiber: data.fiber || 0,
      baseUnit: 'g',
      baseQuantity: 100,
      wholeWeight: data.wholeWeight || 100,
      source: source
    });
  } catch (dbError) {
    console.error('Failed to cache search result:', dbError);
  }

  return { ...data, source };
};

/* STATIC ROUTES (MUST PRECEED PARAMS PATHS) */

// @desc    Get recent logged food items
// @route   GET /api/nutrition/recent
// @access  Private
router.get('/recent', protect, async (req, res) => {
  try {
    const logs = await NutritionLog.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(20);

    const uniqueFoodsMap = new Map();
    for (const logItem of logs) {
      for (const item of logItem.items) {
        const key = item.name.trim().toLowerCase();
        if (!uniqueFoodsMap.has(key)) {
          uniqueFoodsMap.set(key, {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            fiber: item.fiber || 0
          });
        }
        if (uniqueFoodsMap.size >= 12) break;
      }
      if (uniqueFoodsMap.size >= 12) break;
    }
    
    res.json(Array.from(uniqueFoodsMap.values()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user favorite meals
// @route   GET /api/nutrition/favorites
// @access  Private
router.get('/favorites', protect, async (req, res) => {
  try {
    const favorites = await FavoriteMeal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Save favorite meal
// @route   POST /api/nutrition/favorites
// @access  Private
router.post('/favorites', protect, async (req, res) => {
  const { name, calories, protein, carbs, fat, fiber, quantity, unit } = req.body;
  if (!name || calories === undefined) {
    return res.status(400).json({ message: 'Name and calories are required' });
  }

  try {
    const existing = await FavoriteMeal.findOne({ user: req.user._id, name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Favorite meal with this name already exists' });
    }

    const favorite = new FavoriteMeal({
      user: req.user._id,
      name: name.trim(),
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: Number(fiber) || 0,
      quantity: Number(quantity) || 100,
      unit: unit || 'g'
    });
    
    await favorite.save();
    res.status(201).json(favorite);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete favorite meal
// @route   DELETE /api/nutrition/favorites/:id
// @access  Private
router.delete('/favorites/:id', protect, async (req, res) => {
  try {
    const favorite = await FavoriteMeal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!favorite) {
      return res.status(404).json({ message: 'Favorite meal not found' });
    }
    res.json({ message: 'Deleted favorite meal successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add favorite meal to daily log
// @route   POST /api/nutrition/favorites/:id/add/:date
// @access  Private
router.post('/favorites/:id/add/:date', protect, async (req, res) => {
  const { id, date } = req.params;
  try {
    const favorite = await FavoriteMeal.findOne({ _id: id, user: req.user._id });
    if (!favorite) {
      return res.status(404).json({ message: 'Favorite meal not found' });
    }

    let log = await NutritionLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = new NutritionLog({ user: req.user._id, date, items: [] });
    }

    log.items.push({
      name: favorite.name,
      quantity: favorite.quantity,
      unit: favorite.unit,
      calories: favorite.calories,
      protein: favorite.protein,
      carbs: favorite.carbs,
      fat: favorite.fat,
      fiber: favorite.fiber
    });

    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get nutrition analytics summary (scores + suggestions)
// @route   GET /api/nutrition/analytics/summary
// @access  Private
router.get('/analytics/summary', protect, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(400).json({ message: 'Profile unconfigured.' });
    }

    const targetCal = profile.targetCalories || 2000;
    const targetProt = profile.targetProtein || 120;
    const targetCarb = profile.targetCarbs || 200;
    const targetFat = profile.targetFat || 60;
    const targetFib = profile.targetFiber || 25;

    // Last 7 calendar days
    const dateStrings = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateStrings.push(d.toISOString().split('T')[0]);
    }

    const logs = await NutritionLog.find({
      user: req.user._id,
      date: { $in: dateStrings }
    });

    const logMap = new Map(logs.map(l => [l.date, l]));

    let compliantDays = 0;
    let deficitDays = 0;
    let surplusDays = 0;
    let totalProteinAchievedDays = 0;
    let accumulatedSurplusDeficit = 0;
    let totalCalIntake = 0;
    let daysTracked = 0;

    let sumCalories = 0;
    let sumProtein = 0;
    let sumCarbs = 0;
    let sumFat = 0;
    let sumFiber = 0;

    dateStrings.forEach(dateStr => {
      const dayLog = logMap.get(dateStr);
      if (dayLog && dayLog.items.length > 0) {
        daysTracked++;
        totalCalIntake += dayLog.totalCalories;
        sumCalories += dayLog.totalCalories;
        sumProtein += dayLog.totalProtein;
        sumCarbs += dayLog.totalCarbs;
        sumFat += dayLog.totalFat;
        sumFiber += dayLog.totalFiber || 0;

        const diff = dayLog.totalCalories - targetCal;
        accumulatedSurplusDeficit += diff;
        
        if (diff < 0) {
          deficitDays++;
        } else if (diff > 0) {
          surplusDays++;
        }

        if (Math.abs(diff) <= targetCal * 0.1) {
          compliantDays++;
        }

        if (dayLog.totalProtein >= targetProt) {
          totalProteinAchievedDays++;
        }
      }
    });

    // Score algorithms
    const calorieScore = daysTracked > 0 
      ? Math.max(0, 100 - Math.round((Math.abs(accumulatedSurplusDeficit / daysTracked) / targetCal) * 100))
      : 0;

    const proteinScore = daysTracked > 0 
      ? Math.min(100, Math.round(((sumProtein / daysTracked) / targetProt) * 100))
      : 0;

    const nutritionScore = Math.round(calorieScore * 0.5 + proteinScore * 0.5);
    const weeklyAdherenceScore = daysTracked > 0 ? Math.round((compliantDays / daysTracked) * 100) : 0;

    // Achievements list
    const achievements = [];
    if (totalProteinAchievedDays > 0) {
      achievements.push(`Protein target achieved on ${totalProteinAchievedDays} of ${daysTracked} days.`);
    } else {
      achievements.push(`Average daily protein: ${daysTracked > 0 ? Math.round(sumProtein / daysTracked) : 0}g (Target: ${targetProt}g).`);
    }

    const avgCalDiff = daysTracked > 0 ? Math.round(accumulatedSurplusDeficit / daysTracked) : 0;
    if (avgCalDiff > 0) {
      achievements.push(`Calories exceeded average target by ${avgCalDiff} kcal.`);
    } else if (avgCalDiff < 0) {
      achievements.push(`Maintained an average daily calorie deficit of ${Math.abs(avgCalDiff)} kcal.`);
    }

    achievements.push(`You maintained a calorie deficit on ${deficitDays} of ${daysTracked || 7} logged days.`);

    // NVIDIA AI Suggestions query
    const systemPrompt = `You are a professional dietitian and sports nutritionist. Output exactly 3 bullet-point food suggestions for the user. Always output ONLY valid JSON. Do not include markdown wraps.`;
    const userPrompt = `Based on the user's past week nutritional metrics:
    - Calories Target: ${targetCal} kcal, Average Eaten: ${daysTracked > 0 ? Math.round(sumCalories / daysTracked) : 0} kcal
    - Protein Target: ${targetProt}g, Average Eaten: ${daysTracked > 0 ? Math.round(sumProtein / daysTracked) : 0}g
    - Carbs Target: ${targetCarb}g, Average Eaten: ${daysTracked > 0 ? Math.round(sumCarbs / daysTracked) : 0}g
    - Fat Target: ${targetFat}g, Average Eaten: ${daysTracked > 0 ? Math.round(sumFat / daysTracked) : 0}g
    - Fiber Target: ${targetFib}g, Average Eaten: ${daysTracked > 0 ? Math.round(sumFiber / daysTracked) : 0}g
    - Fitness Goal: ${profile.fitnessGoal}

    Generate exactly 3 specific, short, actionable nutritional recommendations (e.g., "Increase protein intake by 20g", "Include high fiber grains like oats", "Reduce fat by cooking with less oil").
    Return ONLY a JSON array of strings:
    ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
    Do not return any introductory or concluding text, only the raw JSON.`;

    let suggestions = [];
    try {
      suggestions = await queryNvidiaAI(systemPrompt, userPrompt, true);
    } catch (aiError) {
      console.warn('NVIDIA suggestion generation failed. Using local rules:', aiError);
      // Fallback rules
      if (daysTracked > 0) {
        const avgProtein = sumProtein / daysTracked;
        const avgFiber = sumFiber / daysTracked;
        const avgCalories = sumCalories / daysTracked;

        if (avgProtein < targetProt) {
          suggestions.push('Increase protein intake by adding eggs, chicken breast, or protein shakes.');
        } else {
          suggestions.push('Keep up your excellent protein intake levels!');
        }

        if (avgFiber < targetFib) {
          suggestions.push('Incorporate more high-fiber foods such as oats, broccoli, chia seeds, or apples.');
        } else {
          suggestions.push('Excellent fiber adherence; maintain your whole grains intake.');
        }

        if (avgCalories > targetCal) {
          suggestions.push(`Reduce daily portion sizes to stay within your ${targetCal} kcal goal.`);
        } else {
          suggestions.push('Calorie intake is well-controlled to match your weight goals.');
        }
      } else {
        suggestions = [
          'Log your food for a few days to receive customized suggestions.',
          'Ensure you consume high protein foods to support muscle recovery.',
          'Aim to hit at least 25g of fiber daily from vegetable and fruit sources.'
        ];
      }
    }

    res.json({
      nutritionScore,
      weeklyAdherenceScore,
      calorieAnalysis: {
        avgIntake: daysTracked > 0 ? Math.round(sumCalories / daysTracked) : 0,
        avgProtein: daysTracked > 0 ? Math.round(sumProtein / daysTracked) : 0,
        avgCarbs: daysTracked > 0 ? Math.round(sumCarbs / daysTracked) : 0,
        avgFat: daysTracked > 0 ? Math.round(sumFat / daysTracked) : 0,
        avgFiber: daysTracked > 0 ? Math.round(sumFiber / daysTracked) : 0,
        daysTracked,
        compliantDays,
        deficitDays,
        surplusDays
      },
      achievements,
      suggestions
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* DYNAMIC PARAMS ROUTES */

// @desc    Get daily nutrition log
// @route   GET /api/nutrition/:date
// @access  Private
router.get('/:date', protect, async (req, res) => {
  const { date } = req.params;

  try {
    let log = await NutritionLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = {
        date,
        items: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0
      };
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add food item to daily log
// @route   POST /api/nutrition/:date
// @access  Private
router.post('/:date', protect, async (req, res) => {
  const { date } = req.params;
  const { name, quantity, unit } = req.body;

  if (!name || !quantity || !unit) {
    return res.status(400).json({ message: 'Name, quantity, and unit are required' });
  }

  try {
    const parsedQuantity = Number(quantity);
    const baseNutrient = await searchNutritionComposition(name);
    const multiplier = getUnitMultiplier(parsedQuantity, unit, baseNutrient.wholeWeight);

    let log = await NutritionLog.findOne({ user: req.user._id, date });

    if (!log) {
      log = new NutritionLog({
        user: req.user._id,
        date,
        items: []
      });
    }

    log.items.push({
      name: baseNutrient.name || name,
      quantity: parsedQuantity,
      unit,
      calories: Math.round(baseNutrient.calories * multiplier),
      protein: Math.round(baseNutrient.protein * multiplier * 10) / 10,
      carbs: Math.round(baseNutrient.carbs * multiplier * 10) / 10,
      fat: Math.round(baseNutrient.fat * multiplier * 10) / 10,
      fiber: Math.round((baseNutrient.fiber || 0) * multiplier * 10) / 10,
      source: baseNutrient.source
    });

    await log.save();
    res.status(201).json({ log, source: baseNutrient.source });
  } catch (error) {
    console.error('Error adding food item:', error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Quick-Add macro meal directly
// @route   POST /api/nutrition/:date/quick-add
// @access  Private
router.post('/:date/quick-add', protect, async (req, res) => {
  const { date } = req.params;
  const { name, calories, protein, carbs, fat, fiber } = req.body;

  if (!name || calories === undefined) {
    return res.status(400).json({ message: 'Name and calories are required' });
  }

  try {
    let log = await NutritionLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = new NutritionLog({ user: req.user._id, date, items: [] });
    }

    log.items.push({
      name: name.trim(),
      quantity: 1,
      unit: 'serving',
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: Number(fiber) || 0,
      source: 'manual'
    });

    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update quantity of a logged food item (re-calculates macros)
// @route   PATCH /api/nutrition/:date/:itemId
// @access  Private
router.patch('/:date/:itemId', protect, async (req, res) => {
  const { date, itemId } = req.params;
  const { quantity } = req.body;

  if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
    return res.status(400).json({ message: 'Valid quantity is required' });
  }

  try {
    const log = await NutritionLog.findOne({ user: req.user._id, date });
    if (!log) return res.status(404).json({ message: 'Nutrition log not found' });

    const item = log.items.id(itemId);
    if (!item) return res.status(404).json({ message: 'Food item not found' });

    // Re-compute macros based on new quantity; original stored per 100g from cache
    const cachedFood = await FoodCache.findOne({ name: item.name.trim().toLowerCase() });
    if (cachedFood) {
      const multiplier = getUnitMultiplier(Number(quantity), item.unit, cachedFood.wholeWeight || 100);
      item.quantity = Number(quantity);
      item.calories = Math.round(cachedFood.calories * multiplier);
      item.protein = Math.round(cachedFood.protein * multiplier * 10) / 10;
      item.carbs = Math.round(cachedFood.carbs * multiplier * 10) / 10;
      item.fat = Math.round(cachedFood.fat * multiplier * 10) / 10;
      item.fiber = Math.round((cachedFood.fiber || 0) * multiplier * 10) / 10;
      item.source = cachedFood.source || 'cache';
    } else {
      // If no cache, scale proportionally from existing values
      const ratio = Number(quantity) / item.quantity;
      item.calories = Math.round(item.calories * ratio);
      item.protein = Math.round(item.protein * ratio * 10) / 10;
      item.carbs = Math.round(item.carbs * ratio * 10) / 10;
      item.fat = Math.round(item.fat * ratio * 10) / 10;
      item.fiber = Math.round((item.fiber || 0) * ratio * 10) / 10;
      item.quantity = Number(quantity);
    }

    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete food item from daily log
// @route   DELETE /api/nutrition/:date/:itemId
// @access  Private
router.delete('/:date/:itemId', protect, async (req, res) => {
  const { date, itemId } = req.params;

  try {
    const log = await NutritionLog.findOne({ user: req.user._id, date });

    if (!log) {
      return res.status(404).json({ message: 'Nutrition log not found' });
    }

    log.items = log.items.filter(item => item._id.toString() !== itemId);
    await log.save();

    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
