const mongoose = require('mongoose');

const timerSchema = new mongoose.Schema({
    timerId: {
        type: String,
        default: 'offerProductTimer',
        unique: true
    },
    hours: {
        type: Number,
        default: 0
    },
    minutes: {
        type: Number,
        default: 0
    },
    seconds: {
        type: Number,
        default: 0
    },
    totalSeconds: {
        type: Number,
        default: 0
    },
    isRunning: {
        type: Boolean,
        default: false
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Add a method to calculate remaining time
timerSchema.methods.calculateRemainingTime = function() {
    if (!this.isRunning || !this.endTime) {
        return {
            hours: this.hours,
            minutes: this.minutes,
            seconds: this.seconds,
            totalSeconds: this.totalSeconds,
            isRunning: false
        };
    }

    const now = new Date();
    const endTime = new Date(this.endTime);
    
    if (now >= endTime) {
        // Timer has expired
        return {
            hours: 0,
            minutes: 0,
            seconds: 0,
            totalSeconds: 0,
            isRunning: false
        };
    }

    const remainingMs = endTime - now;
    const remainingSeconds = Math.floor(remainingMs / 1000);
    
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    return {
        hours,
        minutes,
        seconds,
        totalSeconds: remainingSeconds,
        isRunning: true
    };
};

module.exports = mongoose.model('Timer', timerSchema);