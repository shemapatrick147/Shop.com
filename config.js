// config.js - Create this as a new file to share between pages
export const SUPABASE_CONFIG = {
    url: 'https://mhmjnvsyakpwsuwhvvgy.supabase.co',
    key: 'process.env.SUPABASE_KEY' // Replace with your actual key
};

// checkout.js - Add this script to your checkout page
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config.js';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);

async function submitOrder(orderData) {
    try {
        const orderId = 'ORD-' + Date.now();
        
        const dbOrderData = {
            id: orderId,
            customer_name: orderData.shipping.fullName,
            shipping_address: `${orderData.shipping.address}, ${orderData.shipping.city}, ${orderData.shipping.postalCode}`,
            total_amount: orderData.total,
            status: 'pending',
            items: orderData.items,
            created_at: new Date().toISOString(),
            payment_details: {
                last_four: orderData.payment.cardNumber.slice(-4),
                expiration: orderData.payment.expiration
            }
        };

        const { data, error } = await supabase
            .from('orders')
            .insert([dbOrderData]);

        if (error) throw error;

        localStorage.removeItem('cart');
        alert(`Order placed successfully! Your order ID is: ${orderId}`);
        window.location.href = '/order-confirmation.html';

    } catch (error) {
        console.error('Error submitting order:', error);
        alert('There was an error processing your order. Please try again.');
    }
}

// Add this to your checkout.html before the closing </body> tag
document.getElementById("checkout-form").onsubmit = async function(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const orderData = {
        shipping: {
            fullName: formData.get('full-name'),
            address: formData.get('address'),
            city: formData.get('city'),
            postalCode: formData.get('postal-code'),
        },
        payment: {
            cardName: formData.get('card-name'),
            cardNumber: formData.get('card-number'),
            expiration: formData.get('expiration'),
            cvv: formData.get('cvv'),
        },
        items: JSON.parse(localStorage.getItem('cart')) || [],
        total: document.getElementById('total-price').textContent.replace('$', '')
    };

    await submitOrder(orderData);
};

// admin.js - Add this script to your admin page
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config.js';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);

async function loadOrders() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const orderList = document.getElementById('order-list');
        orderList.innerHTML = '';

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.customer_name}</td>
                <td>$${order.total_amount}</td>
                <td>
                    <select class="status-select" data-order-id="${order.id}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <button class="view-details-btn" data-order-id="${order.id}">View Details</button>
                </td>
            `;
            orderList.appendChild(row);
        });

        // Add event listeners for status changes
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const orderId = e.target.dataset.orderId;
                const newStatus = e.target.value;
                
                const { error } = await supabase
                    .from('orders')
                    .update({ status: newStatus })
                    .eq('id', orderId);

                if (error) {
                    console.error('Error updating status:', error);
                    alert('Error updating order status');
                }
            });
        });

        // Add event listeners for view details buttons
        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const orderId = e.target.dataset.orderId;
                const order = orders.find(o => o.id === orderId);
                
                const details = `
                    Order Details:
                    Order ID: ${order.id}
                    Customer: ${order.customer_name}
                    Address: ${order.shipping_address}
                    Total: $${order.total_amount}
                    Items: ${order.items.map(item => `\n- ${item.name} ($${item.price})`).join('')}
                    Created: ${new Date(order.created_at).toLocaleString()}
                `;
                
                alert(details);
            });
        });

    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Error loading orders. Please refresh the page.');
    }
}

// Initialize admin page
loadOrders();