const express = require('express');
const cors = require('cors'); // Allows frontend to access backend
const bodyParser = require('body-parser');

const app = express();
app.use(cors()); // Enable CORS for frontend integration
app.use(bodyParser.json());

let orders = []; // Temporary in-memory storage

// Submit Order
app.post('/submit-order', (req, res) => {
    const orderData = req.body;
    orders.push(orderData); // Store order
    console.log('New order received:', orderData);
    res.status(200).json({ message: 'Order successfully submitted!' });
});

// Fetch all orders
app.get('/get-orders', (req, res) => {
    res.json(orders);
});

// Update order status
app.post('/update-order', (req, res) => {
    const { id, status } = req.body;
    const order = orders.find(o => o.id === id);
    if (order) {
        order.status = status;
        res.json({ message: "Order updated successfully" });
    } else {
        res.status(404).json({ message: "Order not found" });
    }
});

// Start server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
