const express = require('express');
const router = express.Router();
const OfferProduct = require('./OfferProductSchema'); 

// GET all offer products
router.get('/offerProduct', async (req, res) => {
    try {
        const offerProducts = await OfferProduct.find().sort({ createdAt: -1 });
        res.json(offerProducts);
    } catch (error) {
        console.error('Error fetching offer products:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// GET single offer product
router.get('/offerProduct/:id', async (req, res) => {
    try {
        const offerProduct = await OfferProduct.findById(req.params.id);
        if (!offerProduct) {
            return res.status(404).json({ message: 'Offer product not found' });
        }
        res.json(offerProduct);
    } catch (error) {
        console.error('Error fetching offer product:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// CREATE new offer product
router.post('/offerProduct', async (req, res) => {
    try {
        const offerProduct = new OfferProduct(req.body);
        const savedOffer = await offerProduct.save();
        res.status(201).json(savedOffer);
    } catch (error) {
        console.error('Error creating offer product:', error);
        res.status(400).json({ message: error.message });
    }
});

// UPDATE offer product
router.put('/offerProduct/:id', async (req, res) => {
    try {
        const updatedOffer = await OfferProduct.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedOffer) {
            return res.status(404).json({ message: 'Offer product not found' });
        }
        res.json(updatedOffer);
    } catch (error) {
        console.error('Error updating offer product:', error);
        res.status(400).json({ message: error.message });
    }
});

// UPDATE visibility
router.patch('/offerProduct/:id', async (req, res) => {
    try {
        const { visible } = req.body;
        const updatedOffer = await OfferProduct.findByIdAndUpdate(
            req.params.id,
            { visible },
            { new: true }
        );
        if (!updatedOffer) {
            return res.status(404).json({ message: 'Offer product not found' });
        }
        res.json(updatedOffer);
    } catch (error) {
        console.error('Error updating visibility:', error);
        res.status(400).json({ message: error.message });
    }
});

// DELETE offer product
router.delete('/offerProduct/:id', async (req, res) => {
    try {
        const deletedOffer = await OfferProduct.findByIdAndDelete(req.params.id);
        if (!deletedOffer) {
            return res.status(404).json({ message: 'Offer product not found' });
        }
        res.json({ message: 'Offer product deleted successfully' });
    } catch (error) {
        console.error('Error deleting offer product:', error);
        res.status(500).json({ message: error.message });
    }
}); 

module.exports = router;

