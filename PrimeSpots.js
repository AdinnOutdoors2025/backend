const express = require('express');
const router = express.Router();
const PrimeProductData = require('./PrimeSpotSchema'); 

// GET all prime products
router.get('/primeSpots', async (req, res) => {
    try {
        const primeProducts = await PrimeProductData.find().sort({ createdAt: -1 });
        res.json(primeProducts);
    } catch (error) {
        console.error('Error fetching prime products:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// GET single prime product
router.get('/primeSpots/:id', async (req, res) => {
    try {
        const primeProduct = await PrimeProductData.findById(req.params.id);
        if (!primeProduct) {
            return res.status(404).json({ message: 'prime product not found' });
        }
        res.json(primeProduct);
    } catch (error) {
        console.error('Error fetching prime product:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// CREATE new prime product
router.post('/primeSpots', async (req, res) => {
    try {
        const primeProduct = new PrimeProductData(req.body);
        const savedprime = await primeProduct.save();
        res.status(201).json(savedprime);
    } catch (error) {
        console.error('Error creating prime product:', error);
        res.status(400).json({ message: error.message });
    }
});

// UPDATE prime product
router.put('/primeSpots/:id', async (req, res) => {
    try {
        const updatedPrime = await PrimeProductData.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedPrime) {
            return res.status(404).json({ message: 'prime product not found' });
        }
        res.json(updatedPrime);
    } catch (error) {
        console.error('Error updating prime product:', error);
        res.status(400).json({ message: error.message });
    }
});

// UPDATE visibility
router.patch('/primeSpots/:id', async (req, res) => {
    try {
        const { visible } = req.body;
        const updatedPrime = await PrimeProductData.findByIdAndUpdate(
            req.params.id,
            { visible },
            { new: true }
        );
        if (!updatedPrime) {
            return res.status(404).json({ message: 'prime product not found' });
        }
        res.json(updatedPrime);
    } catch (error) {
        console.error('Error updating visibility:', error);
        res.status(400).json({ message: error.message });
    }
});

// DELETE prime product
router.delete('/primeSpots/:id', async (req, res) => {
    try {
        const deletedPrime = await PrimeProductData.findByIdAndDelete(req.params.id);
        if (!deletedPrime) {
            return res.status(404).json({ message: 'prime product not found' });
        }
        res.json({ message: 'prime product deleted successfully' });
    } catch (error) {
        console.error('Error deleting prime product:', error);
        res.status(500).json({ message: error.message });
    }
}); 

module.exports = router;