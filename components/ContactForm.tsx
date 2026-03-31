"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      setMessage({ type: "error", text: "Por favor, preencha todos os campos obrigatórios" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await apiClient.submitContactForm(formData);

      if (response.success) {
        setMessage({ type: "success", text: response.message });
        // Reset form
        setFormData({ name: "", email: "", phone: "", message: "" });
      } else {
        setMessage({ type: "error", text: response.message });
      }
    } catch (error: any) {
      console.error("Erro ao enviar formulário:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.detail || "Erro ao enviar mensagem. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-card rounded-lg shadow-md p-8 border-2 border-border">
        <h2 className="text-3xl font-bold text-foreground mb-3">Entre em Contato</h2>
        <p className="text-lg text-muted-foreground mb-8">
          Tem alguma dúvida ou precisa de ajuda? Envie-nos uma mensagem e retornaremos em breve.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-base font-medium text-foreground mb-2">
              Nome <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Seu nome completo"
              disabled={submitting}
              required
              className="w-full text-base py-3"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-base font-medium text-foreground mb-2">
              E-mail <span className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu.email@exemplo.com"
              disabled={submitting}
              required
              className="w-full text-base py-3"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-base font-medium text-foreground mb-2">
              Telefone <span className="text-muted-foreground">(opcional)</span>
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(11) 98765-4321"
              disabled={submitting}
              className="w-full text-base py-3"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-base font-medium text-foreground mb-2">
              Mensagem <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Digite sua mensagem aqui..."
              disabled={submitting}
              required
              rows={6}
              className="w-full px-4 py-3 text-base border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full text-base py-6">
            {submitting ? "Enviando..." : "Enviar Mensagem"}
          </Button>
        </form>

        {message && (
          <div
            className={`mt-6 p-4 rounded-md ${
              message.type === "success"
                ? "bg-green-500/10 text-green-800 dark:text-green-300 border border-green-500/30"
                : "bg-red-500/10 text-red-800 dark:text-red-300 border border-red-500/30"
            }`}
          >
            <p className="text-base font-medium">{message.text}</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-xl font-semibold text-foreground mb-4">Outras Formas de Contato</h3>
          <div className="space-y-3 text-base text-muted-foreground">
            <p>
              <strong>E-mail:</strong> contato@controlladora.com.br
            </p>
            <p>
              <strong>Telefone:</strong> (11) 1234-5678
            </p>
            <p>
              <strong>Endereço:</strong> São Paulo, SP - Brasil
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
