import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, MessageCircle } from "lucide-react";
import { WHATSAPP_URL_LANDING as WHATSAPP_URL } from "../constants/contact";

const NAV_LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#caracteristicas", label: "Características" },
  { href: "#como-funciona", label: "Cómo Funciona" },
  { href: "#impacto", label: "Impacto" },
  { href: "/planes", label: "Planes" },
];

const LandingNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href) => {
    // Ruta interna (no ancla)
    if (!href.startsWith("#")) {
      navigate(href);
      setMenuOpen(false);
      return;
    }
    // Ancla: smooth scroll en landing, navigate desde otras páginas
    if (location.pathname === "/") {
      const el = document.querySelector(href);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    } else {
      navigate("/" + href);
    }
    setMenuOpen(false);
  };

  return (
    <header
      role="banner"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100"
          : "bg-transparent"
      }`}
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between"
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Logo Abakosoft"
            className="w-12 h-12 rounded-xl object-cover"
          />
          <span
            className={`text-xl font-extrabold tracking-tight transition-colors ${
              scrolled ? "text-slate-800" : "text-white"
            }`}
          >
            ABAKOSOFT
          </span>
        </div>

        {/* Links desktop */}
        <ul className="hidden md:flex items-center gap-8" role="list">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <button
                onClick={() => handleNavClick(href)}
                className={`text-sm font-medium transition-colors hover:text-indigo-500 cursor-pointer ${
                  scrolled ? "text-slate-600" : "text-white/80"
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>

        {/* CTAs desktop */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contactar por WhatsApp"
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Contáctanos
          </a>
          <Link
            to="/login"
            className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-colors ${
              scrolled
                ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                : "border-white/30 text-white hover:bg-white/10"
            }`}
          >
            Ingresar
          </Link>
        </div>

        {/* Hamburger mobile */}
        <button
          className={`md:hidden p-1 rounded-lg transition-colors ${
            scrolled
              ? "text-slate-700 hover:bg-slate-100"
              : "text-white hover:bg-white/10"
          }`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label="Abrir menú"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Menú mobile */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-b border-gray-100 shadow-lg overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map(({ href, label }) => (
                <button
                  key={href}
                  onClick={() => handleNavClick(href)}
                  className="block w-full text-left text-sm font-medium text-slate-600 hover:text-indigo-600 py-2.5 px-3 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  {label}
                </button>
              ))}
              <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-500 text-white text-sm font-semibold px-4 py-3 rounded-xl"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  Contáctanos por WhatsApp
                </a>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-center text-sm font-semibold px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Ingresar al sistema
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default LandingNavbar;
