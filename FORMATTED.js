// INDIAN CURRENCY FORMATTING FUNCTION
const formatIndianCurrency = (amount) => {
    // if (typeof amount !== 'number' || isNaN(amount) || amount === null || amount === undefined) {
    //     return '₹0';
    // }
    
    // Round to nearest whole number (remove decimals)
    const num = Math.round(amount);
    
    // Handle negative numbers
    const isNegative = num < 0;
    const absAmount = Math.abs(num);
    
    // Convert to string and add commas
    const numStr = absAmount.toString();
    const len = numStr.length;
    
    if (len <= 3) {
        return isNegative ? `-₹${numStr}` : `₹${numStr}`;
    }
    
    let lastThree = numStr.substring(len - 3);
    let otherNumbers = numStr.substring(0, len - 3);
    
    if (otherNumbers !== '') {
        lastThree = ',' + lastThree;
    }
    
    const result = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    
    return isNegative ? `-₹${result}` : `₹${result}`;
};

// INDIAN DATE FORMATTING FUNCTION (10-dec-2025)
const formatIndianDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
        // Handle both Date objects and strings
        const date = dateString instanceof Date ? dateString : new Date(dateString);
        
        if (isNaN(date.getTime())) {
            // Try parsing ISO string or other formats
            if (typeof dateString === 'string' && dateString.includes('-')) {
                const parts = dateString.split('-');
                if (parts.length === 3) {
                    const day = parseInt(parts[2]);
                    const month = parseInt(parts[1]) - 1;
                    const year = parseInt(parts[0]);
                    
                    const newDate = new Date(year, month, day);
                    if (!isNaN(newDate.getTime())) {
                        return formatDate(newDate);
                    }
                }
            }
            return 'Invalid Date';
        }
        
        return formatDate(date);
        
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Invalid Date';
    }
};

// Helper function for date formatting
const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()].toLowerCase();
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
};

// CURRENT DATE IN INDIAN FORMAT

const getCurrentIndianDate = () => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[today.getMonth()].toLowerCase();
    const year = today.getFullYear();
    
    return `${day}-${month}-${year}`;
};

module.exports = {
    formatIndianCurrency,
    formatIndianDate,
    getCurrentIndianDate
};