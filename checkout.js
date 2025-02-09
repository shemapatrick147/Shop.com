// checkout.js - Add this to your checkout page
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://mhmjnvsyakpwsuwhvvgy.supabase.co';
const SUPABASE_KEY = 'your_supabase_key_here'; // Replace with your key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Format cart items for better display in admin
function formatCartItems(cartItems) {
    return cartItems.map(item => ({
        id: item.id || Date.now(),
        name: item.name,
        price: parseFloat(item.price.replace('$', '')),
        quantity: item.quantity || 1,
        image: item.image,
        subtotal: parseFloat(item.price.replace('$', '')) * (item.quantity || 1)
    }));
}

// Validate form data
function validateFormData(formData) {
    const requiredFields = ['full-name', 'address', 'city', 'postal-code', 
                          'card-name', 'card-number', 'expiration', 'cvv'];
    
    for (let field of requiredFields) {
        if (!formData.get(field)) {
            throw new Error(`${field.replace('-', ' ')} is required`);
        }
    }

    // Basic card validation
    const cardNumber = formData.get('card-number').replace(/\s/g, '');
    if (!/^\d{16}$/.test(cardNumber)) {
        throw new Error('Invalid card number');
    }

    const cvv = formData.get('cvv');
    if (!/^\d{3,4}$/.test(cvv)) {
        throw new Error('Invalid CVV');
    }
}

// Create loading spinner
function createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        ">
            <div style="
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
            "></div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    return spinner;
}

// Handle the order submission
async function submitOrder(orderData) {
    const spinner = createLoadingSpinner();
    document.body.appendChild(spinner);

    try {
        // Generate unique order ID
        const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Format cart items
        const formattedItems = formatCartItems(orderData.items);
        
        // Calculate total
        const total = formattedItems.reduce((sum, item) => sum + item.subtotal, 0);

        // Prepare order data
        const dbOrderData = {
            id: orderId,
            customer_name: orderData.shipping.fullName,
            shipping_address: `${orderData.shipping.address}, ${orderData.shipping.city}, ${orderData.shipping.postalCode}`,
            total_amount: total,
            status: 'pending',
            items: formattedItems,
            created_at: new Date().toISOString(),
            payment_details: {
                last_four: orderData.payment.cardNumber.slice(-4),
                expiration: orderData.payment.expiration,
                card_holder: orderData.payment.cardName
            },
            customer_email: orderData.shipping.email,
            customer_phone: orderData.shipping.phone,
            notes: orderData.notes || '',
            metadata: {
                user_agent: navigator.userAgent,
                ip_address: await fetch('https://api.ipify.org?format=json')
                    .then(res => res.json())
                    .then(data => data.ip)
                    .catch(() => 'unknown'),
                timestamp: Date.now()
            }
        };

        // Insert order into Supabase
        const { data, error } = await supabase
            .from('orders')
            .insert([dbOrderData]);

        if (error) throw error;

        // Clear cart
        localStorage.removeItem('cart');
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 2rem;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.2);
                text-align: center;
                z-index: 10000;
            ">
                <h2 style="color: #27ae60; margin-bottom: 1rem;">Order Placed Successfully!</h2>
                <p>Order ID: ${orderId}</p>
                <p>Total Amount: $${total.toFixed(2)}</p>
                <p>We'll send you an email confirmation shortly.</p>
                <button onclick="window.location.href='/'" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 5px;
                    margin-top: 1rem;
                    cursor: pointer;
                ">Return to Home</button>
            </div>
        `;
        document.body.appendChild(successMessage);

        // Remove spinner
        spinner.remove();

        // Optional: Send confirmation email
        // This would typically be handled by your backend
        
        return true;

    } catch (error) {
        console.error('Error submitting order:', error);
        spinner.remove();
        alert(`Error processing your order: ${error.message}`);
        return false;
    }
}

// Add to your checkout.html before </body>
document.getElementById("checkout-form").onsubmit = async function(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);

    try {
        // Validate form data
        validateFormData(formData);

        // Get cart items
        const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        if (cartItems.length === 0) {
            throw new Error('Your cart is empty');
        }

        const orderData = {
            shipping: {
                fullName: formData.get('full-name'),
                address: formData.get('address'),
                city: formData.get('city'),
                postalCode: formData.get('postal-code'),
                email: formData.get('email'),
                phone: formData.get('phone')
            },
            payment: {
                cardName: formData.get('card-name'),
                cardNumber: formData.get('card-number').replace(/\s/g, ''),
                expiration: formData.get('expiration'),
                cvv: formData.get('cvv')
            },
            items: cartItems,
            notes: formData.get('order-notes')
        };

        const success = await submitOrder(orderData);
        if (success) {
            // Disable form to prevent double submission
            event.target.style.pointerEvents = 'none';
            event.target.style.opacity = '0.7';
        }

    } catch (error) {
        alert(error.message);
    }
};

// Add these helper functions to enhance the checkout experience
document.addEventListener('DOMContentLoaded', function() {
    // Format credit card number as user types
    const cardInput = document.getElementById('card-number');
    if (cardInput) {
        cardInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            e.target.value = value;
        });
    }

    // Auto-capitalize name inputs
    const nameInputs = document.querySelectorAll('input[id$="name"]');
    nameInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\b\w/g, l => l.toUpperCase());
        });
    });
});