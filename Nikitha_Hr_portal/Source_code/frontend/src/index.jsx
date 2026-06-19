import React from 'react';
import ReactDOM from 'react-dom/client';

// Scope localStorage globally by logged-in user email
const originalGetItem = localStorage.getItem;
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;

const getScopedKey = (key) => {
  if (key === "token" || key === "username" || key === "gmail") {
    return key;
  }
  const email = originalGetItem.call(localStorage, "gmail");
  return email ? `${email}_${key}` : key;
};

localStorage.getItem = function(key) {
  return originalGetItem.call(localStorage, getScopedKey(key));
};

localStorage.setItem = function(key, value) {
  originalSetItem.call(localStorage, getScopedKey(key), value);
};

localStorage.removeItem = function(key) {
  originalRemoveItem.call(localStorage, getScopedKey(key));
};

import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
