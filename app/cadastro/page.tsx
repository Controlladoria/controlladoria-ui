"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import Image from "next/image";

export default function CadastroPage() {
  const [formData, setFormData] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    celular: "",
    pais: "Brasil",
    regimeTributario: "",
    periodoApuracao: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return value;
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData((prev) => ({ ...prev, cnpj: formatted }));
    if (errors.cnpj) {
      setErrors((prev) => ({ ...prev, cnpj: "" }));
    }
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setFormData((prev) => ({ ...prev, cep: formatted }));
    if (errors.cep) {
      setErrors((prev) => ({ ...prev, cep: "" }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData((prev) => ({ ...prev, celular: formatted }));
    if (errors.celular) {
      setErrors((prev) => ({ ...prev, celular: "" }));
    }
  };

  const handleCNPJBlur = async () => {
    const cnpj = formData.cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) return;

    setLoadingCNPJ(true);
    try {
      // TODO: Integrate with Receita Federal API
      // For now, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulated data - replace with actual API integration
      // const response = await fetch(`https://api.receitafederal.gov.br/cnpj/${cnpj}`);
      // const data = await response.json();

      // Mock data for demonstration
      console.log("CNPJ lookup:", cnpj);
      // You would populate formData with API response here
    } catch (error) {
      console.error("Erro ao buscar dados do CNPJ:", error);
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.razaoSocial.trim()) {
      newErrors.razaoSocial = "Razão social é obrigatória";
    }

    if (!formData.nomeFantasia.trim()) {
      newErrors.nomeFantasia = "Nome fantasia é obrigatório";
    }

    const cnpj = formData.cnpj.replace(/\D/g, "");
    if (!cnpj) {
      newErrors.cnpj = "CNPJ é obrigatório";
    } else if (cnpj.length !== 14) {
      newErrors.cnpj = "CNPJ deve ter 14 dígitos";
    }

    if (!formData.endereco.trim()) {
      newErrors.endereco = "Endereço é obrigatório";
    }

    if (!formData.numero.trim()) {
      newErrors.numero = "Número é obrigatório";
    }

    if (!formData.cidade.trim()) {
      newErrors.cidade = "Cidade é obrigatória";
    }

    if (!formData.estado.trim()) {
      newErrors.estado = "Estado é obrigatório";
    }

    const cep = formData.cep.replace(/\D/g, "");
    if (!cep) {
      newErrors.cep = "CEP é obrigatório";
    } else if (cep.length !== 8) {
      newErrors.cep = "CEP deve ter 8 dígitos";
    }

    const celular = formData.celular.replace(/\D/g, "");
    if (!celular) {
      newErrors.celular = "Celular é obrigatório";
    } else if (celular.length < 10 || celular.length > 11) {
      newErrors.celular = "Celular inválido";
    }

    if (!formData.regimeTributario) {
      newErrors.regimeTributario = "Regime tributário é obrigatório";
    }

    if (!formData.periodoApuracao) {
      newErrors.periodoApuracao = "Período de apuração é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // TODO: Integrate with backend API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Form submitted:", formData);
      alert("Cadastro realizado com sucesso!");

      // Redirect to dashboard or login
      // window.location.href = "/";
    } catch (error) {
      console.error("Erro ao cadastrar empresa:", error);
      alert("Erro ao cadastrar empresa. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.svg"
                alt="ControlladorIA"
                width={180}
                height={50}
                priority
                className="h-12 w-auto"
              />
              <div className="border-l pl-4">
                <p className="text-slate-600 font-medium">Cadastro de Empresa</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline">← Voltar ao Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Cadastre sua Empresa</CardTitle>
            <CardDescription>
              Preencha os dados da sua empresa para começar a usar o ControlladorIA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Info Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Dados da Empresa
                </h3>

                {/* CNPJ */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    CNPJ *
                  </label>
                  <div className="relative">
                    <Input
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={handleCNPJChange}
                      onBlur={handleCNPJBlur}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className={errors.cnpj ? "border-red-500" : ""}
                    />
                    {loadingCNPJ && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                  {errors.cnpj && (
                    <p className="text-sm text-red-600 mt-1">{errors.cnpj}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Digite o CNPJ para preencher automaticamente os dados
                  </p>
                </div>

                {/* Razão Social */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Razão Social *
                  </label>
                  <Input
                    name="razaoSocial"
                    value={formData.razaoSocial}
                    onChange={handleChange}
                    placeholder="Nome legal da empresa"
                    className={errors.razaoSocial ? "border-red-500" : ""}
                  />
                  {errors.razaoSocial && (
                    <p className="text-sm text-red-600 mt-1">{errors.razaoSocial}</p>
                  )}
                </div>

                {/* Nome Fantasia */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nome Fantasia *
                  </label>
                  <Input
                    name="nomeFantasia"
                    value={formData.nomeFantasia}
                    onChange={handleChange}
                    placeholder="Nome comercial da empresa"
                    className={errors.nomeFantasia ? "border-red-500" : ""}
                  />
                  {errors.nomeFantasia && (
                    <p className="text-sm text-red-600 mt-1">{errors.nomeFantasia}</p>
                  )}
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Endereço</h3>

                {/* CEP */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CEP *
                    </label>
                    <Input
                      name="cep"
                      value={formData.cep}
                      onChange={handleCEPChange}
                      placeholder="00000-000"
                      maxLength={9}
                      className={errors.cep ? "border-red-500" : ""}
                    />
                    {errors.cep && (
                      <p className="text-sm text-red-600 mt-1">{errors.cep}</p>
                    )}
                  </div>
                </div>

                {/* Street and Number */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Endereço *
                    </label>
                    <Input
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleChange}
                      placeholder="Rua, Avenida, etc."
                      className={errors.endereco ? "border-red-500" : ""}
                    />
                    {errors.endereco && (
                      <p className="text-sm text-red-600 mt-1">{errors.endereco}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Número *
                    </label>
                    <Input
                      name="numero"
                      value={formData.numero}
                      onChange={handleChange}
                      placeholder="123"
                      className={errors.numero ? "border-red-500" : ""}
                    />
                    {errors.numero && (
                      <p className="text-sm text-red-600 mt-1">{errors.numero}</p>
                    )}
                  </div>
                </div>

                {/* Complement and District */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Complemento
                    </label>
                    <Input
                      name="complemento"
                      value={formData.complemento}
                      onChange={handleChange}
                      placeholder="Apto, Sala, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Bairro
                    </label>
                    <Input
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleChange}
                      placeholder="Nome do bairro"
                    />
                  </div>
                </div>

                {/* City and State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cidade *
                    </label>
                    <Input
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleChange}
                      placeholder="São Paulo"
                      className={errors.cidade ? "border-red-500" : ""}
                    />
                    {errors.cidade && (
                      <p className="text-sm text-red-600 mt-1">{errors.cidade}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Estado *
                    </label>
                    <Select
                      value={formData.estado}
                      onValueChange={(value) => handleSelectChange("estado", value)}
                    >
                      <SelectTrigger className={errors.estado ? "border-red-500" : ""}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AC">Acre</SelectItem>
                        <SelectItem value="AL">Alagoas</SelectItem>
                        <SelectItem value="AP">Amapá</SelectItem>
                        <SelectItem value="AM">Amazonas</SelectItem>
                        <SelectItem value="BA">Bahia</SelectItem>
                        <SelectItem value="CE">Ceará</SelectItem>
                        <SelectItem value="DF">Distrito Federal</SelectItem>
                        <SelectItem value="ES">Espírito Santo</SelectItem>
                        <SelectItem value="GO">Goiás</SelectItem>
                        <SelectItem value="MA">Maranhão</SelectItem>
                        <SelectItem value="MT">Mato Grosso</SelectItem>
                        <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                        <SelectItem value="MG">Minas Gerais</SelectItem>
                        <SelectItem value="PA">Pará</SelectItem>
                        <SelectItem value="PB">Paraíba</SelectItem>
                        <SelectItem value="PR">Paraná</SelectItem>
                        <SelectItem value="PE">Pernambuco</SelectItem>
                        <SelectItem value="PI">Piauí</SelectItem>
                        <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                        <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                        <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                        <SelectItem value="RO">Rondônia</SelectItem>
                        <SelectItem value="RR">Roraima</SelectItem>
                        <SelectItem value="SC">Santa Catarina</SelectItem>
                        <SelectItem value="SP">São Paulo</SelectItem>
                        <SelectItem value="SE">Sergipe</SelectItem>
                        <SelectItem value="TO">Tocantins</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.estado && (
                      <p className="text-sm text-red-600 mt-1">{errors.estado}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Contato</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Celular *
                    </label>
                    <Input
                      name="celular"
                      value={formData.celular}
                      onChange={handlePhoneChange}
                      placeholder="(11) 98765-4321"
                      maxLength={15}
                      className={errors.celular ? "border-red-500" : ""}
                    />
                    {errors.celular && (
                      <p className="text-sm text-red-600 mt-1">{errors.celular}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      País *
                    </label>
                    <Input
                      name="pais"
                      value={formData.pais}
                      onChange={handleChange}
                      placeholder="Brasil"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Tax Info Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Informações Fiscais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Regime Tributário *
                    </label>
                    <Select
                      value={formData.regimeTributario}
                      onValueChange={(value) =>
                        handleSelectChange("regimeTributario", value)
                      }
                    >
                      <SelectTrigger
                        className={errors.regimeTributario ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simples">Simples Nacional</SelectItem>
                        <SelectItem value="presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="real">Lucro Real</SelectItem>
                        <SelectItem value="mei">MEI</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.regimeTributario && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.regimeTributario}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Período de Apuração *
                    </label>
                    <Select
                      value={formData.periodoApuracao}
                      onValueChange={(value) =>
                        handleSelectChange("periodoApuracao", value)
                      }
                    >
                      <SelectTrigger
                        className={errors.periodoApuracao ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.periodoApuracao && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.periodoApuracao}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? "Cadastrando..." : "Cadastrar Empresa"}
                </Button>
                <Link href="/" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancelar
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-slate-600 text-center">
                Já possui cadastro?{" "}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Faça login aqui
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
