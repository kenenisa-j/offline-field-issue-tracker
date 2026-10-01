'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        // Register service worker after window load to prevent delaying initial rendering
        const registerSW = () => {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((registration) => {
                    console.log('[PWA] Service Worker registered with scope:', registration.scope);

                    // Check for updates periodically
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (!installingWorker) return;

                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    console.log('[PWA] New content is available; please refresh.');
                                } else {
                                    console.log('[PWA] Content is cached for offline use.');
                                }
                            }
                        };
                    };
                })
                .catch((error) => {
                    console.warn('[PWA] Service Worker registration failed:', error);
                });
        };

        if (document.readyState === 'complete') {
            registerSW();
        } else {
            window.addEventListener('load', registerSW);
            return () => window.removeEventListener('load', registerSW);
        }
    }, []);

    return null;
}
