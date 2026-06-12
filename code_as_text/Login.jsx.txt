import React from 'react';
import '../styles/login.css';

export default function Login() {
    const handleGoogleLogin = () => {
        window.location.href = 'http://localhost:8000/auth/google';
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <img src="/logo.png" alt="OneVoice Logo" className="login-logo" />
                <h1>Welcome to OneVoice</h1>
                <p>Your AI-powered college assistant</p>
                <button className="google-btn" onClick={handleGoogleLogin}>
                    <img
                        src="https://developers.google.com/identity/images/g-logo.png"
                        alt="Google"
                        width="20"
                    />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}