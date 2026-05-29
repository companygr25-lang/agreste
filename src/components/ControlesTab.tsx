/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, Search, AlertTriangle, ShieldCheck, CheckCircle2, 
  HelpCircle, Sparkles, Filter, FileSpreadsheet, Compass, 
  Leaf, Zap, Eye, RefreshCw, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TabProps {
  theme: 'light' | 'dark';
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface ControlType {
  id: string;
  name: string;
  category: 'vegetal' | 'urbano' | 'higienizacao' | 'biosseguranca' | 'quarentena';
  summary: string;
  etymology?: string;
  description: string;
  correctUsage: string;
  incorrectUsage: string;
  forbiddenScenarios: string[];
  techChecklist: string[];
  epis: string[];
  reentryInterval: string;
}

export default function ControlesTab({ theme, showToast }: TabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [activeCardId, setActiveCardId] = useState<string | null>('fitossanitario');
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const controlTypes: ControlType[] = [
    {
      id: 'fitossanitario',
      name: 'Controle Fitossanitário',
      category: 'vegetal',
      summary: 'Tratamento estritamente focado na defesa vegetal e áreas de plantio/lavoura.',
      etymology: 'Do grego "fito" (planta) + do latim "sanitas" (saúde). Refere-se à saúde da flora.',
      description: 'Defesa e proteção à cultura vegetal contra pragas agrícolas ou florestais. Tem por objetivo evitar a introdução ou propagação de vetores que afetam lavouras, sementes, árvores de reflorestamento e jardins.',
      correctUsage: 'Uso exclusivo em tratamento de jardins ornamentais, paisagismo, áreas verdes urbanas específicas, lavouras e tratamentos regulatórios quarentenários de trânsito internacional.',
      incorrectUsage: 'É tecnicamente incorreto e proibido usar "Controle Fitossanitário" para se referir à dedetização de baratas, formigas ou cupins em residências, apartamentos e prédios urbanos convencionais.',
      forbiddenScenarios: [
        'Desinsetização interna de cozinhas residenciais ou estabelecimentos comerciais.',
        'Controle de baratas urbanas ou moscas varejeiras em escritórios.',
        'Limpeza de caixas de água.'
      ],
      techChecklist: [
        'Avaliar o estágio fenológico das plantas antes de escolher o fitofármaco.',
        'Checar as previsões climáticas (evitar pulverizações com ventos acima de 10km/h ou risco de chuva iminente).',
        'Informar o cliente sobre restrições de colheita ou consumo caso haja árvores frutíferas próximas.'
      ],
      epis: ['Macacão hidrorrepelente (tipo 4)', 'Máscara com filtro de carvão ativado para vapores orgânicos', 'Luvas de nitrilo de cano longo', 'Viseira antirespingo ou óculos de ampla visão'],
      reentryInterval: 'Geralmente 24 horas (ou conforme bula expressa do produto comercial).'
    },
    {
      id: 'desinsetizacao',
      name: 'Controle de Insetos / Desinsetização Urbana',
      category: 'urbano',
      summary: 'Controle químico e biológico de insetos sinantrópicos rasteiros e voadores em edificações.',
      etymology: 'Prefixo "des" (remover) + do latim "insectum" (cortado em segmentos, inseto).',
      description: 'Mapeamento sistêmico e aplicação direcionada de praguicidas urbanos (domitaneadores) para redução e manejo populacional de baratas, escorpiões, pulgas, cupins urbanos, formigas e mosquitos.',
      correctUsage: 'Apropriado para residências, condomínios prediais, comércios de alimentos, hotéis, galpões de logística e escritórios.',
      incorrectUsage: 'Não referir-se a este manejo como "Controle Agroflorestal" ou "Fitossanitário" se for feito puramente no concreto construído (ambientes cinzas ou urbanizados).',
      forbiddenScenarios: [
        'Mistura ilegal de formulações agrícolas de uso restrito em ambientes domésticos urbanos.',
        'Aplicação direta de inseticidas de amplo espectro em fontes ou espelhos de água potável.'
      ],
      techChecklist: [
        'Localizar ralos e barreiras físicas que possam ser seladas preventivamente.',
        'Realizar aplicação espacial focada em frestas e quinas de azulejos deteriorados.',
        'Retirar alimentos de pets e louças das superfícies que serão pulverizadas.'
      ],
      epis: ['Calça e camisa de manga comprida com CA vigente', 'Máscara facial PFF2 para poeiras/névoas', 'Luvas de proteção química de nitrilo', 'Botas de PVC com solado antiderrapante'],
      reentryInterval: '6 a 12 horas para pessoas saudáveis. 24 horas para gestantes, idosos e animais de estimação.'
    },
    {
      id: 'desratizacao',
      name: 'Manejo de Roedores / Desratização',
      category: 'urbano',
      summary: 'Disposição de portas-iscas e monitoramento contínuo de roedores de relevância epidemiológica.',
      etymology: 'Prefixo "des" (cessar) + do latim "ratus" (referência popular ao roedor).',
      description: 'Estratégias físicas e químicas contra roedores sinantrópicos como ratazanas, ratos de telhado e camundongos. Envolve o bloqueio de vias de alimentação, abrigo e água (parâmetros de manejo integrado).',
      correctUsage: 'Uso de blocos parafinados, iscas extrusadas e granulados acondicionados exclusivamente dentro de Porta-Iscas (PPI - Pontos de Monitoramento Inspecionados) lacrados e numerados.',
      incorrectUsage: 'Lançar iscas soltas ao chão, ao alcance de crianças ou animais de estimação. Tal prática constitui crime ambiental e de responsabilidade.',
      forbiddenScenarios: [
        'Uso do raticida popularmente conhecido como "Chumbinho" (monocrotofós ou aldicarb), cujo comércio e manipulação ilegal são estritamente proibidos.',
        'Distribuição indiscriminada de iscas sem o mapeamento físico e fixação segura dos dispositivos.'
      ],
      techChecklist: [
        'Identificar pegadas, roídas, fezes e manchas laboratoriais para determinar as linhas de passagem predominantes.',
        'Fixar firmemente as caixas porta-iscas com abraçadeiras, parafusos ou adesivos técnicos na base.',
        'Registrar a numeração exata de cada PPI mapeado e seu respectivo consumo percentual.'
      ],
      epis: ['Luvas de borracha nitrílica reforçada (nunca manipular iscas com mãos desprotegidas devido ao odor humano)', 'Óculos de proteção transparente', 'Calçado de segurança antiderrapante'],
      reentryInterval: 'Entrada imediata permitida nas dependências, visto que o produto químico está totalmente isolado e protegido nas caixas técnicas.'
    },
    {
      id: 'higienizacao',
      name: 'Higienização e Desinfecção de Caixas de Água',
      category: 'higienizacao',
      summary: 'Eliminação mecânica e química de crostas minerais e biofilmes em reservatórios.',
      etymology: 'Do latim "hygieina" (ciência da preservação da saúde) e "desinfectio" (purificação de toxinas).',
      description: 'Esgotamento técnico, escovação manual das superfícies e posterior eliminação química por aspersão de soluções à base de hipoclorito de sódio aferido. Garante as condições microbiológicas de potabilidade hídrica.',
      correctUsage: 'Limpeza semestral obrigatória em caixas verticais, cisternas horizontais, torres de captação e reservatórios residenciais de pequeno e grande porte.',
      incorrectUsage: 'Utilizar escovas metálicas que fragilizem a impermeabilização original do reservatório de fibrocimento ou fibra de vidro.',
      forbiddenScenarios: [
        'Falta de teste de estanqueidade pós-procedimento.',
        'Falta de checagem do nível de cloro residual livre antes de liberar o fluxo doméstico.'
      ],
      techChecklist: [
        'Executar teste de segurança em espaços confinados (NR-33) com detector triplo de gases suspensos.',
        'Utilizar escovas de cerdas macias de nylon no bojo e paredes para preservar a impermeabilização.',
        'Realizar o descarte higiênico do lodo e sedimentos retirados da base de forma apropriada.'
      ],
      epis: ['Cinto de segurança com trava-quedas (NR-35)', 'Bota impermeável de borracha branca', 'Capa de chuva ou macacão de PVC leve', 'Máscara facial inteira com filtro de cloro ativo'],
      reentryInterval: 'Não se aplica pessoalmente. O consumo da água deve aguardar o reabastecimento completo e checagem sensorial de odor/sabor.'
    },
    {
      id: 'sanitizacao',
      name: 'Sanitização de Ambientes / Controle Microbiológico',
      category: 'higienizacao',
      summary: 'Redução drástica de vírus, bactérias e esporos fúngicos suspensos no ar.',
      etymology: 'Do inglês "sanitize" (reduzir germes a níveis seguros recomendados por órgãos oficiais).',
      description: 'Atomização a frio ou nebulização pneumática ultra-suave de produtos saneantes específicos de uso profissional (frequentemente quaternários de amônio de 5ª geração). Voltado ao bem-estar do microclima interior.',
      correctUsage: 'Uso ideal em ambientes climatizados de alta circulação (escolas, academias, teatros, lares de idosos, veículos de transporte público).',
      incorrectUsage: 'Promover a sanitização com promessa enganosa de controle residual contra mosquitos ou pulgas. Trata-se de desinfecção estritamente microbiológica imediata.',
      forbiddenScenarios: [
        'Permanência de pessoas na sala de nebulização ativa.',
        'Falta de proteção em telas de computadores ou eletrônicos sensíveis a umidade salina.'
      ],
      techChecklist: [
        'Desligar temporariamente o sistema de climatização forçada para reter a pluma desinfetante no ambiente.',
        'Proceder com a vaporização partindo do fundo do cômodo em direção à porta principal.',
        'Cobrir com filme transparente teclados de computadores expostos e sistemas ópticos ópticos.'
      ],
      epis: ['Macacão impermeável descartável tipo Tyvek', 'Máscara facial PFF2 carbonada', 'Protetores auriculares de silicone', 'Luvas descartáveis de nitrilo reforçado'],
      reentryInterval: 'Normalmente 2 a 3 horas, após as gotículas precipitarem e o ambiente ser ventilado por circulação forçada.'
    },
    {
      id: 'fumigacao',
      name: 'Controle Quarentenário / Fumigação Internacional',
      category: 'quarentena',
      summary: 'Expurgo químico sob vácuo ou pressão atmosférica de cargas e madeiras de comércio exterior.',
      etymology: 'Do latim "fumigare" (criar fumaça, expelir fumaça tóxica controlada).',
      description: 'Tratamento profilático internacional exigido por governos nacionais (MAPA no Brasil) para cargas florestais ou agrícolas destinadas à exportação, visando conter vetores exóticos.',
      correctUsage: 'Tratamento de paletes de exportação, contêineres de alimentos ensacados e porões de navios mineraleiros ou graneleiros.',
      incorrectUsage: 'Não confundir "Fumigação técnica" (gás ativo sob lona hermética) com serviços comuns de desinsetização urbana por névoa úmida.',
      forbiddenScenarios: [
        'Utilização do ingrediente fosfeto de alumínio em áreas integradas com habitações civis vizinhas à usabilidade.',
        'Perfuração inadvertida das lonas de expurgo durante o período de vedação mínimo exigido por lei.'
      ],
      techChecklist: [
        'Fazer a pesagem exata dos cilindros de gás pré e pós-aplicação no campo.',
        'Aplicar fitas adesivas seladoras de alta aderência térmica nas juntas e estender lona com micragem regulamentar.',
        'Aferir a dispersão com detector portátil de gás halogenado em perímetro de raio seguro.'
      ],
      epis: ['Máscara panorâmica autônoma de pressão positiva', 'Detector portátil pessoal de vapores halogenados / Fosfina', 'Vestuário impermeabilizado denso', 'Bota reforçada antiderrapante'],
      reentryInterval: 'Exige exaustão total e leitura de 0 ppm dos gases residuais via sensor portátil de alta sensibilidade antes de autorizar qualquer manuseio.'
    },
    {
      id: 'desalojamento',
      name: 'Desalojamento de Pombos (Manejo de Avifauna)',
      category: 'biosseguranca',
      summary: 'Barreiras físicas de repulsão de pombos domésticos em beirais sem causar danos biológicos.',
      etymology: 'Do latim "fugas" (afugentamento, expulsão por método mecânico ou sensorial não violento).',
      description: 'Manejo populacional da ave doméstica Columbia livia através de barreiras mecânicas, plásticas e sensoriais. A espécie é protegida pela Lei de Crimes Ambientais, o que torna as técnicas não letais as únicas adequadas por lei.',
      correctUsage: 'Instalação de espículas lisas rombudas de policarbonato, mola helicoidal em beirais elevados, redes em vãos técnicos, fios tensionados de aço inox de alta resistência ou aplicação de gel aromático tátil.',
      incorrectUsage: 'Lançar grãos envenenados, utilizar estilingues ou armadilhas perfurantes. Tais práticas são graves infrações penais e passíveis de penalidades financeiras e de detenção.',
      forbiddenScenarios: [
        'Capturar pombos ativos e soltá-los em outras áreas sem autorização expressa do IBAMA.',
        'Aplicação de produtos repelentes químicos abrasivos de venda proibida.'
      ],
      techChecklist: [
        'Molhar com solução desinfetante (hipoclorito) as fezes acumuladas secas antes de varrer para impedir esporos aéreos nocivos.',
        'Medir as lacunas estruturais de beirais de telhados para dimensionar com exatidão a malha plástica de contenção.',
        'Realizar a instalação mecânica e fixação de barreira esticada com cabo guia de aço e esticadores.'
      ],
      epis: ['Máscara respiratória PFF3 (alta eficiência para partículas biogênicas)', 'Óculos de ampla visão perfeitamente vedados', 'Macacão impermeável leve', 'Luvas de raspa de couro reforçadas'],
      reentryInterval: 'Acesso imediato permitido nas dependências após a faxina completa e instalação física.'
    }
  ];

  // Technical Quiz/Simulator Data
  const quizQuestions = [
    {
      question: 'Uma imobiliária em Garanhuns solicita orçamento para detetizar baratas e moscas em 10 chalés de luxo. Qual a denominação técnica do serviço que o técnico deve inserir no laudo técnico?',
      options: [
        'Tratamento Fitossanitário Agroflorestal (pois são chalés em área verde).',
        'Controle Especial de Pragas Urbanas / Desinsetização (pois foca em insetos de áreas construídas e urbanas).',
        'Extermínio Fitogenético Veterinário das Áreas Comuns (pois envolve jardinagem periférica).',
        'Sanitização Quarentenária Interna (por se tratar de uma área hoteleira turística).'
      ],
      correctIndex: 1,
      explanation: 'Exato! Desinsetização Urbana ou Controle Integrado de Pragas Urbanas é o termo correto. Como o alvo são baratas urbanas na estrutura construída do chalé, "Fitossanitário" é incorreto, dado que este foca unicamente em pragas de origem ecológica vegetal/planta.'
    },
    {
      question: 'A Agreste Controle de Pragas foi contratada para eliminar cochonilhas e pulgões que estão destruindo as roseiras e gramas de uma mansão de Garanhuns. Qual o termo técnico apropriado para esse laudo?',
      options: [
        'Desvetação Biológica Interna.',
        'Higienização de Reservatório Vegetal.',
        'Controle Fitossanitário (com foco em jardinagem/áreas verdes urbanas ornamentais).',
        'Fumigação Quarentenária Nacional.'
      ],
      correctIndex: 2,
      explanation: 'Correto! Por se tratar estritamente de saúde vegetal (roseiras e gramas - plantas), o prefixo "fito" (planta) se aplica perfeitamente. Trata-se de uma das exceções válidas para o uso do termo fora de contexto meramente agrícola tradicional.'
    },
    {
      question: 'Qual dos seguintes atos representa uma infração grave (Crime Ambiental) na execução e denominação do controle de vetores?',
      options: [
        'Utilizar gel inseticida de uso comum em frestas de azulejos deteriorados.',
        'Aplicar raticida líquido ou granulado solto ao chão (sem porta-iscas) ou utilizar formulações de varejo ilegais ("chumbinho").',
        'Colocar fita adesiva amarela reflexiva de segurança indicando a presença de iscas na fábrica.',
        'Efetuar hidrojateamento mecânico sem o uso simultâneo de produtos químicos nocivos.'
      ],
      correctIndex: 1,
      explanation: 'Corretíssimo! A utilização e fabricação ilegal do conhecido "chumbinho" são infrações criminais severas. Além do risco letal a animais e crianças, gera passivo criminal imediato para o aplicador técnico profissional e a empresa.'
    }
  ];

  const filteredControls = controlTypes.filter(control => {
    const matchesSearch = control.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          control.summary.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          control.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || control.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeControl = controlTypes.find(c => c.id === activeCardId) || controlTypes[0];

  const handleQuizAnswerSelect = (index: number) => {
    if (quizSubmitted) return;
    setQuizAnswer(index);
  };

  const submitQuizAnswer = () => {
    if (quizAnswer === null) {
      showToast('Por favor, selecione uma das opções acima.', 'info');
      return;
    }
    setQuizSubmitted(true);
    if (quizAnswer === quizQuestions[currentQuestionIndex].correctIndex) {
      showToast('Parabéns! Resposta técnica correta.', 'success');
    } else {
      showToast('Alerta Técnico: Essa denominação pode gerar irregularidades.', 'error');
    }
  };

  const nextQuizQuestion = () => {
    setQuizAnswer(null);
    setQuizSubmitted(false);
    setCurrentQuestionIndex((prev) => (prev + 1) % quizQuestions.length);
  };

  return (
    <div className="space-y-6" id="controles-view-container">
      {/* Top Banner and Brand Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-radial from-zinc-900 via-zinc-950 to-black p-6 md:p-8 border border-zinc-900/60 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D35400] rounded-full blur-[100px] opacity-10 pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D35400]/10 border border-[#D35400]/25 text-[#D35400] text-[10px] font-extrabold tracking-wider uppercase font-mono">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Manual do Técnico da Agreste
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white">
              Guia Técnico e Tipos de Controles
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl font-medium">
              Acesso rápido às definições científicas, etimologias, usos adequados e termos estritamente controlados ou proibidos no faturamento militar e emissão de laudos de saúde ambiental.
            </p>
          </div>
          <div className="shrink-0">
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center min-w-[150px] shadow-lg">
              <BookOpen className="w-7 h-7 mx-auto text-[#D35400] mb-2" />
              <span className="text-[10px] font-bold text-zinc-400 block font-mono">Controle de Normas</span>
              <strong className="text-xs text-white uppercase font-black block mt-0.5">Versão 1.5 Ativa</strong>
            </div>
          </div>
        </div>
      </div>

      {/* CRITICAL MISTAKE HIGHLIGHT (User Specific requirement on "Controle Fitossanitário" wrong/correct usage) */}
      <div className="bg-amber-500/10 border-l-4 border-amber-600 rounded-r-2xl p-5 shadow-sm text-zinc-200" id="critica-fito-aviso">
        <div className="flex gap-4">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 self-start">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider font-display">
              ALERTA CLANDESTINO E REGULATÓRIO: O Erro do Termo "Fitossanitário" em Áreas Urbanas
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              Membros técnicos e operadores administrativos frequentemente introduzem o termo <strong className="text-white">"Controle Fitossanitário"</strong> de forma incorreta em faturas e laudos de dedetização de baratas e cupins residenciais. O prefixo <strong className="text-amber-400 font-mono">"fito"</strong> deriva do grego <em className="italic">phyton</em> (planta). Portanto, relaciona-se exclusivamente à defesa agronômica vegetal.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px] font-medium leading-relaxed">
              <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/40">
                <span className="text-red-400 font-bold block mb-1">❌ USO INCORRETO (PROIBIDO):</span>
                <span className="text-zinc-400">"Controle Fitossanitário de baratas latrinas em cozinhas residenciais ou controle de ratos no forro."</span>
              </div>
              <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/40">
                <span className="text-emerald-400 font-bold block mb-1">✓ USO CORRETO E EXCEÇÃO:</span>
                <span className="text-zinc-400">"Controle de pulgões ou fungos de jardins e gramados urbanos" OU "Tratamento de embalagens de madeira de exportação com fins quarentenários (Fumigação)."</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Bento Navigation Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="bento-technical-search">
        {/* Left column - Selectors and listings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-900/80 shadow-md space-y-3">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest font-display flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#D35400]" /> Filtrar Conceitos
            </h3>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Buscar controle, etimologia ou produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-805/90 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-[#D35400] transition-colors"
              />
            </div>

            {/* Category Quick Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'vegetal', label: 'Vegetal', icon: <Leaf className="w-3 h-3" /> },
                { id: 'urbano', label: 'Urbano', icon: <Compass className="w-3 h-3" /> },
                { id: 'higienizacao', label: 'Higienização', icon: <FileSpreadsheet className="w-3 h-3" /> },
                { id: 'biosseguranca', label: 'Manejo Animal / Proteção', icon: <ShieldCheck className="w-3 h-3" /> },
                { id: 'quarentena', label: 'Quarentenário', icon: <Zap className="w-3 h-3" /> }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer flex items-center gap-1.5 transition-all ${
                    selectedCategory === cat.id 
                      ? 'bg-[#D35400] text-white shadow-sm' 
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-850 hover:bg-zinc-900/50'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Filtered Controls */}
          <div className="space-y-2 overflow-y-auto max-h-[500px] pr-2" id="filtered-controls-navigation">
            {filteredControls.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/20 border border-dashed border-zinc-850 rounded-2xl text-zinc-500 text-xs">
                Nenhum tipo de controle localizado com os termos informados.
              </div>
            ) : (
              filteredControls.map((ctrl) => {
                const isActive = ctrl.id === activeCardId;
                return (
                  <button
                    key={ctrl.id}
                    onClick={() => setActiveCardId(ctrl.id)}
                    className={`w-full p-4 rounded-xl border text-left cursor-pointer transition-all duration-150 flex items-center justify-between ${
                      isActive 
                        ? 'bg-[#D35400]/10 border-[#D35400] shadow-md shadow-[#D35400]/5' 
                        : 'bg-zinc-900/30 border-zinc-900 hover:bg-zinc-900/60 hover:border-zinc-800'
                    }`}
                  >
                    <div className="space-y-1 pr-3 truncate flex-1">
                      <div className="flex items-center gap-2">
                        <strong className={`text-xs font-black tracking-wide ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                          {ctrl.name}
                        </strong>
                        <span className={`px-1.5 py-0.2 rounded font-mono text-[8px] font-extrabold uppercase ${
                          ctrl.category === 'vegetal' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                          ctrl.category === 'urbano' ? 'bg-blue-955 text-blue-400 border border-blue-900/30' :
                          ctrl.category === 'higienizacao' ? 'bg-purple-955 text-purple-400 border border-purple-900/30' :
                          'bg-amber-955 text-amber-500 border border-amber-900/30'
                        }`}>
                          {ctrl.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate font-semibold">
                        {ctrl.summary}
                      </p>
                    </div>
                    <Eye className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-[#D35400] scale-110' : 'text-zinc-600'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column - Deep dive technical parameters datasheet */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeControl.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="p-5 md:p-6 rounded-2xl bg-zinc-900/60 border border-zinc-900 shadow-xl space-y-6 text-left"
              id="technical-datasheet-content"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-850 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#D35400] font-extrabold block">Ficha Técnica Regulatória</span>
                  <h2 className="text-lg md:text-xl font-black text-white">{activeControl.name}</h2>
                </div>
                {activeControl.etymology && (
                  <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-850 text-[10px] font-medium text-zinc-300">
                    📚 <strong className="text-zinc-400 font-bold">Etimologia:</strong> {activeControl.etymology}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-[11px] uppercase font-black tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" /> Definição Científica do Manejo
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  {activeControl.description}
                </p>
              </div>

              {/* Usage guidelines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <h4 className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Usos Autorizados e Corretos
                  </h4>
                  <p className="text-[11px] text-zinc-300 font-medium leading-relaxed">
                    {activeControl.correctUsage}
                  </p>
                </div>
                <div className="space-y-2 p-3.5 rounded-xl bg-red-500/5 border border-red-500/20">
                  <h4 className="text-[11px] font-bold text-red-400 flex items-center gap-1.5 uppercase font-mono">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Usos Inadequados ou Proibidos
                  </h4>
                  <p className="text-[11px] text-zinc-300 font-medium leading-relaxed">
                    {activeControl.incorrectUsage}
                  </p>
                </div>
              </div>

              {/* Forbidden Scenarios list */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] uppercase font-black tracking-wider text-zinc-400">
                  ⚠️ Cenários de Glosa de Serviços ou Autos de Infração Regulamentar
                </h4>
                <ul className="space-y-1 text-xs text-zinc-300 pl-1 font-medium">
                  {activeControl.forbiddenScenarios.map((scen, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                      <span>{scen}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actionable checklists + EPIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-850 pt-5">
                <div className="space-y-3">
                  <h4 className="text-[11.5px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
                    📋 Checklist de Campo Prático
                  </h4>
                  <ul className="space-y-1.5 text-xs text-zinc-300 font-medium">
                    {activeControl.techChecklist.map((chk, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#D35400] font-bold shrink-0">✓</span>
                        <span>{chk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 bg-zinc-950/45 p-4 rounded-xl border border-zinc-850/60">
                  <h4 className="text-[11.5px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
                    🛡️ Equipamentos de Proteção OBRIGATÓRIOS (EPIs)
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {activeControl.epis.map((epi, idx) => (
                      <span key={idx} className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-bold">
                        {epi}
                      </span>
                    ))}
                  </div>
                  <div className="pt-2 text-[10px] text-zinc-500 font-mono">
                    <strong>Período Mínimo de Reentrada Geral:</strong><br />
                    <span className="text-[#D35400] font-bold">{activeControl.reentryInterval}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Simulator / Technician Certification Test */}
      <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-6 md:p-8 space-y-4" id="knowledge-quiz-simulator">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-[#D35400]" />
          <div>
            <h3 className="text-lg font-black text-white font-display">Simulador e Desafio de Terminologia Técnica</h3>
            <p className="text-xs text-zinc-400 font-medium">Treinamento corporativo para técnicos e operadores e prevenção de processos judiciais de faturamento.</p>
          </div>
        </div>

        <div className="border border-zinc-850/60 rounded-2xl bg-zinc-950 p-5 space-y-4 text-left">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono font-bold">
            <span>AVALIAÇÃO DA CAPACITAÇÃO INTERNA</span>
            <span>QUESTÃO {currentQuestionIndex + 1} DE {quizQuestions.length}</span>
          </div>

          <p className="text-xs text-white leading-relaxed font-bold">
            {quizQuestions[currentQuestionIndex].question}
          </p>

          <div className="space-y-2">
            {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
              const isSelected = quizAnswer === idx;
              let btnClass = 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800';
              if (isSelected) {
                btnClass = 'bg-[#D35400]/20 text-white border-[#D35400]';
              }
              if (quizSubmitted) {
                if (idx === quizQuestions[currentQuestionIndex].correctIndex) {
                  btnClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-550';
                } else if (isSelected) {
                  btnClass = 'bg-red-500/20 text-red-400 border-red-550';
                } else {
                  btnClass = 'bg-zinc-950 text-zinc-600 border-zinc-900 opacity-60 pointer-events-none';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleQuizAnswerSelect(idx)}
                  disabled={quizSubmitted}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-start gap-3 ${btnClass}`}
                >
                  <span className="font-mono bg-black/40 text-zinc-500 font-extrabold w-5 h-5 rounded-md flex items-center justify-center shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-zinc-850 pt-4 flex-wrap gap-4">
            <div className="text-[10px] text-zinc-500 font-semibold">
              {!quizSubmitted ? 'Escolha uma opção e submeta para validação fiscal.' : 'Questão respondida! Veja a explicação técnica abaixo.'}
            </div>
            
            <div className="flex gap-2">
              {!quizSubmitted ? (
                <button
                  onClick={submitQuizAnswer}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors"
                >
                  Validar Resposta
                </button>
              ) : (
                <button
                  onClick={nextQuizQuestion}
                  className="bg-[#D35400] hover:bg-[#E56A15] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Próxima Questão
                </button>
              )}
            </div>
          </div>

          {/* Explanation block */}
          {quizSubmitted && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-850/50 text-xs text-zinc-300 leading-relaxed font-medium space-y-1 text-left"
            >
              <span className="font-bold text-white block uppercase text-[10.5px] tracking-wider mb-1 font-mono">
                💡 Parecer Científico & Normativo:
              </span>
              <p>{quizQuestions[currentQuestionIndex].explanation}</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
