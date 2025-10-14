// const express = require('express');
// const router = express.Router();
// const Timer = require('./DealTimerSchema');

// // GET timer state - UPDATED for real-time calculation
// router.get('/timer', async (req, res) => {
//     try {
//         let timer = await Timer.findOne({ timerId: 'offerProductTimer' });
        
//         if (!timer) {
//             // Create default timer if not exists
//             timer = new Timer({
//                 timerId: 'offerProductTimer',
//                 hours: 0,
//                 minutes: 0,
//                 seconds: 0,
//                 totalSeconds: 0,
//                 isRunning: false
//             });
//             await timer.save();
//         }

//         let timerData;
        
//         if (timer.isRunning && timer.endTime) {
//             // Calculate real-time remaining time
//             const now = new Date();
//             const endTime = new Date(timer.endTime);
            
//             if (now >= endTime) {
//                 // Timer expired - update database
//                 timer.isRunning = false;
//                 timer.hours = 0;
//                 timer.minutes = 0;
//                 timer.seconds = 0;
//                 timer.totalSeconds = 0;
//                 timer.endTime = null;
//                 await timer.save();
                
//                 timerData = {
//                     hours: 0,
//                     minutes: 0,
//                     seconds: 0,
//                     totalSeconds: 0,
//                     isRunning: false
//                 };
//             } else {
//                 // Calculate remaining time
//                 const remainingMs = endTime - now;
//                 const remainingSeconds = Math.floor(remainingMs / 1000);
                
//                 const hours = Math.floor(remainingSeconds / 3600);
//                 const minutes = Math.floor((remainingSeconds % 3600) / 60);
//                 const seconds = remainingSeconds % 60;
                
//                 timerData = {
//                     hours,
//                     minutes,
//                     seconds,
//                     totalSeconds: remainingSeconds,
//                     isRunning: true
//                 };
                
//                 // Update the timer with current values (optional - for consistency)
//                 timer.hours = hours;
//                 timer.minutes = minutes;
//                 timer.seconds = seconds;
//                 timer.totalSeconds = remainingSeconds;
//                 timer.lastUpdated = new Date();
//                 await timer.save();
//             }
//         } else {
//             // Timer is not running, return stored values
//             timerData = {
//                 hours: timer.hours,
//                 minutes: timer.minutes,
//                 seconds: timer.seconds,
//                 totalSeconds: timer.totalSeconds,
//                 isRunning: timer.isRunning
//             };
//         }

//         res.json(timerData);
//     } catch (error) {
//         console.error('Error fetching timer:', error);
//         res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });

// // UPDATE timer - UPDATED to set endTime
// router.put('/timer', async (req, res) => {
//     try {
//         const { hours, minutes, seconds, isRunning } = req.body;
        
//         const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        
//         let startTime = null;
//         let endTime = null;

//         if (isRunning && totalSeconds > 0) {
//             startTime = new Date();
//             endTime = new Date(startTime.getTime() + (totalSeconds * 1000));
//         }

//         const timer = await Timer.findOneAndUpdate(
//             { timerId: 'offerProductTimer' },
//             {
//                 hours,
//                 minutes,
//                 seconds,
//                 totalSeconds,
//                 isRunning,
//                 startTime: isRunning ? startTime : null,
//                 endTime: isRunning ? endTime : null,
//                 lastUpdated: new Date()
//             },
//             { new: true, upsert: true }
//         );

//         res.json({
//             hours: timer.hours,
//             minutes: timer.minutes,
//             seconds: timer.seconds,
//             totalSeconds: timer.totalSeconds,
//             isRunning: timer.isRunning
//         });
//     } catch (error) {
//         console.error('Error updating timer:', error);
//         res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });

// // RESET timer
// router.delete('/timer/reset', async (req, res) => {
//     try {
//         const timer = await Timer.findOneAndUpdate(
//             { timerId: 'offerProductTimer' },
//             {
//                 hours: 0,
//                 minutes: 0,
//                 seconds: 0,
//                 totalSeconds: 0,
//                 isRunning: false,
//                 startTime: null,
//                 endTime: null,
//                 lastUpdated: new Date()
//             },
//             { new: true }
//         );

//         res.json({ message: 'Timer reset successfully', timer });
//     } catch (error) {
//         console.error('Error resetting timer:', error);
//         res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });

// // Additional endpoint to check timer status (for admin panel)
// router.get('/timer/status', async (req, res) => {
//     try {
//         const timer = await Timer.findOne({ timerId: 'offerProductTimer' });
        
//         if (!timer) {
//             return res.json({
//                 isRunning: false,
//                 hours: 0,
//                 minutes: 0,
//                 seconds: 0,
//                 message: 'No timer found'
//             });
//         }

//         let status = {
//             isRunning: timer.isRunning,
//             hours: timer.hours,
//             minutes: timer.minutes,
//             seconds: timer.seconds,
//             totalSeconds: timer.totalSeconds
//         };

//         if (timer.isRunning && timer.endTime) {
//             const now = new Date();
//             const endTime = new Date(timer.endTime);
            
//             if (now >= endTime) {
//                 status.isRunning = false;
//                 status.hours = 0;
//                 status.minutes = 0;
//                 status.seconds = 0;
//                 status.totalSeconds = 0;
//                 status.message = 'Timer has expired';
//             } else {
//                 const remainingMs = endTime - now;
//                 status.remainingMs = remainingMs;
//                 status.message = 'Timer is running';
//             }
//         }

//         res.json(status);
//     } catch (error) {
//         console.error('Error checking timer status:', error);
//         res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });

// module.exports = router;















const express = require('express');
const router = express.Router();
const Timer = require('./DealTimerSchema');

// GET timer state - UPDATED for real-time calculation
router.get('/timer', async (req, res) => {
    try {
        let timer = await Timer.findOne({ timerId: 'offerProductTimer' });
        
        if (!timer) {
            // Create default timer if not exists
            timer = new Timer({
                timerId: 'offerProductTimer',
                hours: 0,
                minutes: 0,
                seconds: 0,
                totalSeconds: 0,
                isRunning: false
            });
            await timer.save();
        }

        let timerData;
        
        if (timer.isRunning && timer.endTime) {
            // Calculate real-time remaining time
            const now = new Date();
            const endTime = new Date(timer.endTime);
            
            if (now >= endTime) {
                // Timer expired - update database
                timer.isRunning = false;
                timer.hours = 0;
                timer.minutes = 0;
                timer.seconds = 0;
                timer.totalSeconds = 0;
                timer.endTime = null;
                await timer.save();
                
                timerData = {
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    totalSeconds: 0,
                    isRunning: false
                };
            } else {
                // Calculate remaining time
                const remainingMs = endTime - now;
                const remainingSeconds = Math.floor(remainingMs / 1000);
                
                const hours = Math.floor(remainingSeconds / 3600);
                const minutes = Math.floor((remainingSeconds % 3600) / 60);
                const seconds = remainingSeconds % 60;
                
                timerData = {
                    hours,
                    minutes,
                    seconds,
                    totalSeconds: remainingSeconds,
                    isRunning: true
                };
                
                // Update the timer with current values (optional - for consistency)
                timer.hours = hours;
                timer.minutes = minutes;
                timer.seconds = seconds;
                timer.totalSeconds = remainingSeconds;
                timer.lastUpdated = new Date();
                await timer.save();
            }
        } else {
            // Timer is not running, return stored values
            timerData = {
                hours: timer.hours,
                minutes: timer.minutes,
                seconds: timer.seconds,
                totalSeconds: timer.totalSeconds,
                isRunning: timer.isRunning
            };
        }

        res.json(timerData);
    } catch (error) {
        console.error('Error fetching timer:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// UPDATE timer - UPDATED to set endTime
router.put('/timer', async (req, res) => {
    try {
        const { hours, minutes, seconds, isRunning } = req.body;
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        
        let startTime = null;
        let endTime = null;

        if (isRunning && totalSeconds > 0) {
            startTime = new Date();
            endTime = new Date(startTime.getTime() + (totalSeconds * 1000));
        }

        const timer = await Timer.findOneAndUpdate(
            { timerId: 'offerProductTimer' },
            {
                hours,
                minutes,
                seconds,
                totalSeconds,
                isRunning,
                startTime: isRunning ? startTime : null,
                endTime: isRunning ? endTime : null,
                lastUpdated: new Date()
            },
            { new: true, upsert: true }
        );

        res.json({
            hours: timer.hours,
            minutes: timer.minutes,
            seconds: timer.seconds,
            totalSeconds: timer.totalSeconds,
            isRunning: timer.isRunning
        });
    } catch (error) {
        console.error('Error updating timer:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// START timer - NEW endpoint to start timer with existing duration
router.post('/timer/start', async (req, res) => {
    try {
        let timer = await Timer.findOne({ timerId: 'offerProductTimer' });
        
        if (!timer || timer.totalSeconds <= 0) {
            return res.status(400).json({ message: 'No timer duration set' });
        }

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (timer.totalSeconds * 1000));

        const updatedTimer = await Timer.findOneAndUpdate(
            { timerId: 'offerProductTimer' },
            {
                isRunning: true,
                startTime: startTime,
                endTime: endTime,
                lastUpdated: new Date()
            },
            { new: true }
        );

        // Calculate initial remaining time
        const remainingMs = endTime - startTime;
        const remainingSeconds = Math.floor(remainingMs / 1000);
        
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;

        res.json({
            hours,
            minutes,
            seconds,
            totalSeconds: remainingSeconds,
            isRunning: true
        });
    } catch (error) {
        console.error('Error starting timer:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// PAUSE timer - NEW endpoint
router.post('/timer/pause', async (req, res) => {
    try {
        const timer = await Timer.findOneAndUpdate(
            { timerId: 'offerProductTimer' },
            {
                isRunning: false,
                lastUpdated: new Date()
            },
            { new: true }
        );

        if (!timer) {
            return res.status(404).json({ message: 'Timer not found' });
        }

        res.json({
            hours: timer.hours,
            minutes: timer.minutes,
            seconds: timer.seconds,
            totalSeconds: timer.totalSeconds,
            isRunning: false
        });
    } catch (error) {
        console.error('Error pausing timer:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});


// RESET timer
router.delete('/timer/reset', async (req, res) => {
    try {
        const timer = await Timer.findOneAndUpdate(
            { timerId: 'offerProductTimer' },
            {
                hours: 0,
                minutes: 0,
                seconds: 0,
                totalSeconds: 0,
                isRunning: false,
                startTime: null,
                endTime: null,
                lastUpdated: new Date()
            },
            { new: true }
        );

        res.json({ message: 'Timer reset successfully', 
            timer: {
                hours: 0,
                minutes: 0,
                seconds: 0,
                totalSeconds: 0,
                isRunning: false
            }


         });
    } catch (error) {
        console.error('Error resetting timer:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// // Additional endpoint to check timer status (for admin panel)
// router.get('/timer/status', async (req, res) => {
//     try {
//         const timer = await Timer.findOne({ timerId: 'offerProductTimer' });
        
//         if (!timer) {
//             return res.json({
//                 isRunning: false,
//                 hours: 0,
//                 minutes: 0,
//                 seconds: 0,
//                 message: 'No timer found'
//             });
//         }

//         let status = {
//             isRunning: timer.isRunning,
//             hours: timer.hours,
//             minutes: timer.minutes,
//             seconds: timer.seconds,
//             totalSeconds: timer.totalSeconds
//         };

//         if (timer.isRunning && timer.endTime) {
//             const now = new Date();
//             const endTime = new Date(timer.endTime);
            
//             if (now >= endTime) {
//                 status.isRunning = false;
//                 status.hours = 0;
//                 status.minutes = 0;
//                 status.seconds = 0;
//                 status.totalSeconds = 0;
//                 status.message = 'Timer has expired';
//             } else {
//                 const remainingMs = endTime - now;
//                 status.remainingMs = remainingMs;
//                 status.message = 'Timer is running';
//             }
//         }

//         res.json(status);
//     } catch (error) {
//         console.error('Error checking timer status:', error);
//         res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });

module.exports = router;