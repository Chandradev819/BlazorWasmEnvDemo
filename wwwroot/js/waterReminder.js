window.waterReminder = (function () {

    let timerId = null;
    let nextTrigger = null;
    let audioCtx = null;

    function _nowMs() {
        return Date.now();
    }

    // =============================
    // Notification Permission
    // =============================
    async function requestNotificationPermission() {
        if (!('Notification' in window)) return 'denied';

        try {
            return await Notification.requestPermission();
        } catch {
            return 'denied';
        }
    }

    // =============================
    // Audio Beep
    // =============================
    function playBeep() {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 880;

            oscillator.connect(gain);
            gain.connect(audioCtx.destination);

            gain.gain.value = 0.0001;
            oscillator.start();

            gain.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);

            setTimeout(() => {
                gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
                setTimeout(() => {
                    try { oscillator.stop(); } catch { }
                }, 250);
            }, 140);

        } catch { }
    }

    // =============================
    // Show Notification
    // =============================
    function _showNotification(
        title = 'Time to drink water 💧',
        body = 'Stay hydrated — have a glass of water now.'
    ) {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        const options = {
            body: body,
            tag: 'water-reminder',
            renotify: true,
            vibrate: [100, 50, 100]
        };

        try {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready
                    .then(reg => reg.showNotification(title, options))
                    .catch(() => new Notification(title, options));
            } else {
                new Notification(title, options);
            }
        } catch { }
    }

    // =============================
    // Scheduler
    // =============================
    function startReminders(intervalMinutes, startImmediately = false) {

        stopReminders();

        const ms = Math.max(1, Number(intervalMinutes)) * 60 * 1000;

        function scheduleNext() {
            nextTrigger = _nowMs() + ms;
            _persistNextTrigger();

            timerId = setTimeout(() => {
                _showNotification();
                playBeep();
                scheduleNext();
            }, ms);
        }

        if (startImmediately) {
            _showNotification();
            playBeep();
        }

        scheduleNext();
    }

    function stopReminders() {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }

        nextTrigger = null;
        _persistNextTrigger();

        if (audioCtx) {
            try { audioCtx.close(); } catch { }
            audioCtx = null;
        }
    }

    function triggerNow() {
        _showNotification();
        playBeep();
    }

    // =============================
    // Auto Resume After Reopen
    // =============================
    function autoResume(intervalMinutes) {

        const val = localStorage.getItem('waterReminder.nextTrigger');
        if (!val) return;

        const ms = Number(val);
        if (!ms) return;

        const remaining = ms - _nowMs();

        if (remaining > 0) {
            timerId = setTimeout(() => {
                _showNotification();
                playBeep();
                startReminders(intervalMinutes);
            }, remaining);
        } else {
            triggerNow();
            startReminders(intervalMinutes);
        }
    }

    // =============================
    // Missed Reminder Recovery
    // =============================
    function resumeIfMissed() {
        try {
            const val = localStorage.getItem('waterReminder.nextTrigger');
            if (!val) return;

            const ms = Number(val);
            if (!ms) return;

            if (_nowMs() > ms) {
                triggerNow();
            }
        } catch { }
    }

    // =============================
    // Visibility Recovery
    // =============================
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            resumeIfMissed();
        }
    });

    // =============================
    // Persistence
    // =============================
    function _persistNextTrigger() {
        try {
            if (nextTrigger)
                localStorage.setItem('waterReminder.nextTrigger', String(nextTrigger));
            else
                localStorage.removeItem('waterReminder.nextTrigger');
        } catch { }
    }

    function getNextTriggerISO() {
        try {
            const val = localStorage.getItem('waterReminder.nextTrigger');
            if (!val) return '';

            const ms = Number(val);
            if (!ms) return '';

            return new Date(ms).toISOString();
        } catch {
            return '';
        }
    }

    function saveState(state) {
        try {
            localStorage.setItem('waterReminder.state', JSON.stringify(state || {}));
        } catch { }
    }

    function loadState() {
        try {
            return localStorage.getItem('waterReminder.state') || '';
        } catch {
            return '';
        }
    }

    // =============================
    // Public API
    // =============================
    return {
        requestNotificationPermission,
        startReminders,
        stopReminders,
        triggerNow,
        playBeep,
        saveState,
        loadState,
        getNextTriggerISO,
        autoResume,
        resumeIfMissed
    };

})();