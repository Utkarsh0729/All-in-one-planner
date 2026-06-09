import express from 'express';
import { protect } from '../middleware/auth.js';
import NutritionLog from '../models/NutritionLog.js';
import FoodCache from '../models/FoodCache.js';
import { queryNvidiaAI } from '../utils/nvidia.js';

const router = express.Router();

// Helper to convert units to standard multipliers (relative to 100g base)
const getUnitMultiplier = (quantity, unit) => {
  const lowerUnit = unit.toLowerCase();
  if (lowerUnit === 'g' || lowerUnit === 'gm' || lowerUnit === 'grams') {
    return quantity / 100;
  }
  if (lowerUnit === 'ml') {
    return quantity / 100;
  }
  if (lowerUnit === 'piece' || lowerUnit === 'pieces') {
    return quantity * 0.6; // Average piece ~60g
  }
  if (lowerUnit === 'bowl' || lowerUnit === 'bowls') {
    return quantity * 3.0; // Average bowl ~300g
  }
  if (lowerUnit === 'cup' || lowerUnit === 'cups') {
    return quantity * 2.4; // Average cup ~240g
  }
  if (lowerUnit === 'plate' || lowerUnit === 'plates') {
    return quantity * 4.0; // Average plate ~400g
  }
  return quantity; // Default fallback
};

// Search Open Food Facts API (100% free, no key required)
const fetchFromOpenFoodFacts = async (name) => {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'AllInOnePlanner - WebApp - Version 1.0' } });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.products || data.products.length === 0) return null;

    // Pick the first product with nutrient details
    const product = data.products.find(p => p.nutriments && p.nutriments['energy-kcal_100g'] !== undefined);
    if (!product) return null;

    const nutriments = product.nutriments;
    return {
      name: product.product_name || name,
      calories: Math.round(Number(nutriments['energy-kcal_100g'] || 0)),
      protein: Math.round(Number(nutriments['proteins_100g'] || 0) * 10) / 10,
      carbs: Math.round(Number(nutriments['carbohydrates_100g'] || 0) * 10) / 10,
      fat: Math.round(Number(nutriments['fat_100g'] || 0) * 10) / 10,
    };
  } catch (error) {
    console.error('Open Food Facts API error:', error);
    return null;
  }
};

// Query NVIDIA AI for nutritional info per 100g
const fetchFromNvidia = async (name) => {
  const systemPrompt = `You are a food nutrition analyst. Analyze the nutrient composition of this food item.
Provide the nutritional content based on 100g (or 100ml for liquids) standard size.`;
  const userPrompt = `Analyze nutrition for "${name}". Return ONLY a JSON object:
  {
    "name": "formatted food name",
    "calories": number (in kcal per 100g),
    "protein": number (in grams per 100g),
    "carbs": number (in grams per 100g),
    "fat": number (in grams per 100g)
  }
  Do not return any introductory or concluding text, only the raw JSON.`;

  try {
    return await queryNvidiaAI(systemPrompt, userPrompt, true);
  } catch (error) {
    console.error('NVIDIA nutrition API error:', error);
    throw error;
  }
};

// Rules-based mockup fallback
const getMockNutrients = (name) => {
  const cleanName = name.toLowerCase().trim();
  let calories = 100;
  let protein = 2;
  let carbs = 15;
  let fat = 1;

  if (cleanName.includes('egg')) {
    calories = 143; protein = 13; carbs = 0.7; fat = 9.5; // per 100g (about 2 eggs)
  } else if (cleanName.includes('chicken') || cleanName.includes('breast')) {
    calories = 165; protein = 31; carbs = 0; fat = 3.6;
  } else if (cleanName.includes('rice')) {
    calories = 130; protein = 2.7; carbs = 28; fat = 0.3;
  } else if (cleanName.includes('dal') || cleanName.includes('lentil')) {
    calories = 116; protein = 9; carbs = 20; fat = 0.4;
  } else if (cleanName.includes('roti') || cleanName.includes('chapati')) {
    calories = 260; protein = 8; carbs = 55; fat = 1.5;
  } else if (cleanName.includes('paneer') || cleanName.includes('cottage cheese')) {
    calories = 265; protein = 18; carbs = 3; fat = 20;
  } else if (cleanName.includes('banana')) {
    calories = 89; protein = 1.1; carbs = 23; fat = 0.3;
  } else if (cleanName.includes('apple')) {
    calories = 52; protein = 0.3; carbs = 14; fat = 0.2;
  } else if (cleanName.includes('milk')) {
    calories = 60; protein = 3.2; carbs = 4.8; fat = 3.25;
  } else if (cleanName.includes('oats') || cleanName.includes('oatmeal')) {
    calories = 389; protein = 16.9; carbs = 66; fat = 6.9;
  }

  return { name, calories, protein, carbs, fat };
};

// Main nutrition logic with multi-layer fallback and caching
const searchNutritionComposition = async (name) => {
  const searchName = name.toLowerCase().trim();

  // 1. Check Database Cache
  const cachedFood = await FoodCache.findOne({ name: searchName });
  if (cachedFood) {
    console.log(`[Cache Hit] Retrieved nutrition for ${searchName}`);
    return { ...cachedFood.toObject(), source: 'cache' };
  }

  // 2. Check Free Third-Party API (Open Food Facts)
  console.log(`[Cache Miss] Fetching from Open Food Facts API for ${searchName}`);
  let data = await fetchFromOpenFoodFacts(searchName);
  let source = 'open_food_facts';

  // 3. Check NVIDIA AI API if Open Food Facts failed
  if (!data) {
    console.log(`[API Miss] Fetching from NVIDIA AI for ${searchName}`);
    try {
      data = await fetchFromNvidia(searchName);
      source = 'nvidia_ai';
    } catch (nvidiaError) {
      // 4. Final Fallback to Rules-based Local DB
      console.log(`[NVIDIA Miss] Falling back to local dictionary for ${searchName}`);
      data = getMockNutrients(searchName);
      source = 'local_mock';
    }
  }

  // Save the result per 100g to database cache
  try {
    await FoodCache.create({
      name: searchName,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      baseUnit: 'g',
      baseQuantity: 100
    });
    console.log(`[Cache Save] Saved ${searchName} to FoodCache`);
  } catch (dbError) {
    console.error('Failed to save search result to FoodCache:', dbError);
  }

  return { ...data, source };
};

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
        totalFat: 0
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
    
    // Perform search (Cache -> API -> AI -> Fallback)
    const baseNutrient = await searchNutritionComposition(name);
    const multiplier = getUnitMultiplier(parsedQuantity, unit);

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
    });

    await log.save();
    res.status(201).json({ log, source: baseNutrient.source });
  } catch (error) {
    console.error('Error adding food item:', error);
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
