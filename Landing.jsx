import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen kraft-surface flex flex-col justify-end">
      <div className="p-6 pb-10">
        <p className="text-forest-deep/70 text-xs tracking-wide font-medium mb-2">
          MistyMonoliths
        </p>
        <h1 className="font-display text-4xl text-charcoal leading-tight mb-8">
          Sahyadri
          <br />
          Passport
        </h1>

        <Link
          to="/app/vault"
          className="block w-full text-center rounded-lg bg-charcoal text-parchment font-semibold py-3.5 mb-3 shadow-stamp"
        >
          I'm a trekker
        </Link>
        <Link
          to="/manager/login"
          className="block w-full text-center rounded-lg border-2 border-charcoal text-charcoal font-semibold py-3.5"
        >
          Partner store sign-in
        </Link>
      </div>
    </div>
  );
}
