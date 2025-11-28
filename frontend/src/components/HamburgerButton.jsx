// src/components/HamburgerButton.jsx
import React from "react";

export default function HamburgerButton({ onClick=()=>{} }) {
  return (
    <button className="hambtn" onClick={onClick} aria-label="Abrir menu">
      <span className="bar" />
      <span className="bar" />
      <span className="bar" />
    </button>
  );
}
