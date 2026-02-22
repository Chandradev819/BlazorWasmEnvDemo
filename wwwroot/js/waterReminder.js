window.waterReminder = (function () {
    let timerId = null;
    let nextTrigger = null;

    function _nowMs() { return Date.now(); }

    function getUserAgent() {
        return navigator.userAgent || "";
    }

    async function requestNotificationPermission() {
        if (!('Notification' in window)) return 'denied';
        try {
            const p = await Notification.requestPermission();
            return p;
        } catch (e) {
            return 'denied';
        }
    }

    function playBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = 880;
            o.connect(g);
            g.connect(ctx.destination);
            g.gain.value = 0.0001;
            o.start();
            // ramp up quickly
            g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.02);
            setTimeout(() => {
                g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
                setTimeout(() => { try { o.stop(); ctx.close(); } catch (e) { } }, 250);
            }, 140);
        } catch (e) { }
    }

    function _showNotification(title = 'Time to drink water 💧', body = 'Stay hydrated — have a glass of water now.') {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            try {
                const options = { body: body, tag: 'water-reminder', renotify: true, vibrate: [100, 50, 100] };
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options)).catch(() => {
                        new Notification(title, options);
                    });
                } else {
                    new Notification(title, options);
                }
            } catch (e) { }
        }
    }

    function startReminders(intervalMinutes, startImmediately = false) {
        stopReminders();
        const ms = Math.max(1, Number(intervalMinutes)) * 60 * 1000;
        if (startImmediately) {
            triggerNow();
        }
        nextTrigger = _nowMs() + ms;
        timerId = setInterval(() => {
            nextTrigger = _nowMs() + ms;
            _showNotification();
            playBeep();
        }, ms);
        _persistNextTrigger();
    }

    function stopReminders() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        nextTrigger = null;
        _persistNextTrigger();
    }

    function triggerNow() {
        _showNotification();
        playBeep();
        // update next trigger only if timer exists
        if (timerId) {
            // leave nextTrigger as-is; consumers can query it
            _persistNextTrigger();
        }
    }

    function _persistNextTrigger() {
        try {
            if (nextTrigger) localStorage.setItem('waterReminder.nextTrigger', String(nextTrigger));
            else localStorage.removeItem('waterReminder.nextTrigger');
        } catch (e) { }
    }

    function getNextTriggerISO() {
        try {
            const val = localStorage.getItem('waterReminder.nextTrigger');
            if (!val) return '';
            const ms = Number(val);
            if (!ms) return '';
            const d = new Date(ms);
            return d.toISOString();
        } catch (e) { return ''; }
    }

    function saveState(state) {
        try { localStorage.setItem('waterReminder.state', JSON.stringify(state || {})); } catch (e) { }
    }

    function loadState() {
        try {
            const s = localStorage.getItem('waterReminder.state');
            return s || '';
        } catch (e) { return ''; }
    }

    return {
        getUserAgent: getUserAgent,
        requestNotificationPermission: requestNotificationPermission,
        startReminders: startReminders,
        stopReminders: stopReminders,
        triggerNow: triggerNow,
        playBeep: playBeep,
        saveState: saveState,
        loadState: loadState,
        getNextTriggerISO: getNextTriggerISO
    };
})();
