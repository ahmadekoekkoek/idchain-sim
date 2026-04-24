/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  User, 
  Shield, 
  Database, 
  Activity, 
  CheckCircle2, 
  ArrowRight, 
  Smartphone, 
  Building2, 
  Lock, 
  Eye, 
  EyeOff, 
  Bell, 
  ChevronRight,
  DatabaseZap,
  Fingerprint,
  FileBadge,
  AlertCircle,
  Hash,
  Scale,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Constants ---

type AgencyId = 'dukcapil' | 'kemdikbud' | 'ma' | 'bpjs' | 'bank' | 'kemensos' | 'service-provider' | 'trust-registry';

interface Credential {
  id: string;
  type: string;
  issuer: string;
  claims: Record<string, string>;
  isVerified: boolean;
  issuedAt: string;
}

interface SystemEvent {
  id: string;
  timestamp: string;
  type: 'ISSUANCE' | 'PRESENTATION' | 'PROPAGATION' | 'CONSENT';
  actor: string;
  details: string;
}

const AGENCIES: Record<AgencyId, { name: string; icon: React.ReactNode; color: string; pos: { x: number; y: number }; role: 'ISSUER' | 'VERIFIER' | 'REGISTRY' }> = {
  ma: { name: 'Mahkamah Agung', icon: <Scale size={20} />, color: '#c084fc', pos: { x: 20, y: 30 }, role: 'ISSUER' },
  kemdikbud: { name: 'Kemendikbud', icon: <FileBadge size={20} />, color: '#fbbf24', pos: { x: 20, y: 70 }, role: 'ISSUER' },
  dukcapil: { name: 'Dukcapil', icon: <Shield size={20} />, color: '#00d4ff', pos: { x: 50, y: 15 }, role: 'ISSUER' },
  bpjs: { name: 'BPJS Kesehatan', icon: <Activity size={20} />, color: '#10b981', pos: { x: 80, y: 30 }, role: 'VERIFIER' },
  bank: { name: 'HIMBARA Bank', icon: <Building2 size={20} />, color: '#3b82f6', pos: { x: 85, y: 55 }, role: 'VERIFIER' },
  kemensos: { name: 'Kemensos', icon: <User size={20} />, color: '#ef4444', pos: { x: 50, y: 85 }, role: 'VERIFIER' },
  'service-provider': { name: 'PrivyID', icon: <Fingerprint size={20} />, color: '#ec4899', pos: { x: 80, y: 80 }, role: 'VERIFIER' },
  'trust-registry': { name: 'Trust Registry', icon: <DatabaseZap size={20} />, color: '#10b981', pos: { x: 50, y: 38 }, role: 'REGISTRY' },
};

const INITIAL_CREDENTIALS: Credential[] = [
  {
    id: 'vc-001',
    type: 'IdentityCredential',
    issuer: 'did:web:dukcapil.go.id',
    issuedAt: '2024-01-01',
    isVerified: true,
    claims: {
      namaLengkap: 'BUDI SANTOSO',
      tanggalLahir: '1990-05-15',
      nik: '357825XXXXXXXXXX',
      statusPerkawinan: 'KAWIN',
    }
  },
  {
    id: 'vc-002',
    type: 'EducationCredential',
    issuer: 'did:web:kemdikbud.go.id',
    issuedAt: '2023-06-15',
    isVerified: true,
    claims: {
      jenjang: 'S1',
      gelar: 'Sarjana Komputer',
      ipk: '3.85',
    }
  },
  {
    id: 'vc-003',
    type: 'HealthCredential',
    issuer: 'did:web:bpjs.go.id',
    issuedAt: '2024-02-10',
    isVerified: true,
    claims: {
      status: 'Active',
      class: 'Class 1',
      expirancy: '2025-12-31',
    }
  }
];

// --- Sub-components ---

interface NodeProps {
  agency: {
    name: string;
    icon: React.ReactNode;
    color: string;
    pos: { x: number; y: number };
  };
  active?: boolean;
  onClick?: () => void;
}

const Node = ({ agency, active, onClick }: NodeProps) => (
  <motion.div 
    key={agency.name}
    className={`absolute -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] border rounded-full flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all z-10 bg-immersive-card ${active ? 'border-immersive-accent opacity-100 shadow-immersive-glow' : 'border-immersive-border opacity-60 hover:opacity-100'}`}
    style={{ left: `${agency.pos.x}%`, top: `${agency.pos.y}%` }}
    whileHover={{ scale: 1.05 }}
    onClick={onClick}
  >
    <div className="text-xl">
      {agency.icon}
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-immersive-text uppercase tracking-tighter leading-none">{agency.name}</span>
      <span className="text-[8px] text-immersive-dim uppercase font-bold tracking-tighter">
        {agency.role}
      </span>
    </div>
  </motion.div>
);

const FlowLine = ({ from, to, active }: { from: {x:number, y:number}, to: {x:number, y:number}, active?: boolean }) => {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <motion.line
        x1={`${from.x}%`}
        y1={`${from.y}%`}
        x2={`${to.x}%`}
        y2={`${to.y}%`}
        stroke="#3B82F6"
        strokeWidth="1"
        strokeOpacity={active ? 0.3 : 0.05}
        strokeDasharray="4 4"
      />
      {active && (
        <motion.circle
          r="2.5"
          fill="#3B82F6"
          initial={{ offsetDistance: "0%" }}
          animate={{ x: [`${from.x}%`, `${to.x}%`], y: [`${from.y}%`, `${to.y}%`] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}
    </svg>
  );
};

export default function App() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>(INITIAL_CREDENTIALS);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [showWallet, setShowWallet] = useState(false);
  const [consentRequest, setConsentRequest] = useState<{ agency: AgencyId; claims: string[]; purpose: string } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [step, setStep] = useState(0);
  const [showRegistry, setShowRegistry] = useState(false);
  const [showPMT, setShowPMT] = useState(false);
  const [pmtScore, setPmtScore] = useState<{ desil: number; raw: number } | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, boolean>>({});
  const [vpGenerationMode, setVpGenerationMode] = useState<string | null>(null); // vc id

  const addEvent = (type: SystemEvent['type'], actor: string, details: string) => {
    setEvents(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type, actor, details
    }, ...prev].slice(0, 50));
  };

  // --- Scenarios Logic ---

  const runScenario = async (slug: string) => {
    setActiveScenario(slug);
    setIsSimulating(true);
    setStep(1);

    if (slug === 'name-change') {
      addEvent('ISSUANCE', 'Court', 'Legal Name Change Court Decree Issued');
      await wait(1500);
      setStep(2);
      addEvent('ISSUANCE', 'Mahkamah Agung', 'VC Signed by Issuer: LegalNameChange');
      await wait(2000);
      setStep(3);
      setConsentRequest({ 
        agency: 'dukcapil', 
        claims: ['oldName', 'newName', 'courtDecree'], 
        purpose: 'Updating civil registry record (IAL3 Verification)' 
      });
    }

    if (slug === 'bpjs-check') {
      addEvent('PRESENTATION', 'Bank', 'HIMBARA Bank requests BPJS Eligibility status');
      await wait(1500);
      setStep(2);
      setConsentRequest({
        agency: 'bpjs',
        claims: ['status'],
        purpose: 'Loan eligibility verification (Zero Knowledge Predicate Proof)'
      });
    }
    
    if (slug === 'edu-upgrade') {
       addEvent('ISSUANCE', 'Kemendikbud', 'Degree Verified: Sarjana Komputer (S1)');
       await wait(2000);
       setStep(2);
       addEvent('ISSUANCE', 'Kemendikbud', 'VC Issued: SIGNED BY ISSUER (Kemendikbud)');
       await wait(2000);
       setStep(3);
       addEvent('PROPAGATION', 'Event Mesh', 'Broadcasting: identity.education.updated [HASHED NIK USED]');
       setIsSimulating(false);
    }

    if (slug === 'kemensos-eligibility') {
      addEvent('PRESENTATION', 'Kemensos', 'Social Aid Eligibility Check');
      await wait(1500);
      setStep(2);
      setConsentRequest({
        agency: 'kemensos',
        claims: ['incomeLevel', 'employmentStatus'],
        purpose: 'Verification for PKH Program (BBS+ Selective Disclosure)'
      });
    }

    if (slug === 'new-provider-request') {
      addEvent('PRESENTATION', 'PrivyID', 'Identity Verification for E-Signature');
      await wait(1500);
      setStep(2);
      setConsentRequest({
        agency: 'service-provider',
        claims: ['namaLengkap', 'nik'],
        purpose: 'KYC for Digital Signature Activation'
      });
    }

    if (slug === 'pmt-scoring') {
      addEvent('PRESENTATION', 'Kemensos', 'Requesting multi-source data for PMT Scoring');
      await wait(1000);
      setStep(2);
      setConsentRequest({
        agency: 'kemensos',
        claims: ['jenjang', 'statusPerkawinan', 'status'],
        purpose: 'Real-time Socio-Economic Desil calculation (Proxy Means Test)'
      });
    }
  };

  const cancelScenario = () => {
    setActiveScenario(null);
    setIsSimulating(false);
    setStep(0);
    setConsentRequest(null);
  };

  const handleConsent = async (approved: boolean) => {
    if (!approved) {
      addEvent('CONSENT', 'Citizen', 'Access Request Denied');
      cancelScenario();
      return;
    }

    addEvent('CONSENT', 'Citizen', 'Access Request Approved');
    const req = consentRequest!;
    setConsentRequest(null);
    setStep(4);

    if (activeScenario === 'name-change') {
      addEvent('PRESENTATION', 'Dukcapil', 'Presenting Name Change VC | SIGNED BY ISSUER (Court)');
      await wait(2000);
      setStep(5);
      addEvent('ISSUANCE', 'Dukcapil', 'Updating SIAK Registry | ISSUING NEW IdentityVC');
      await wait(2000);
      setStep(6);
      addEvent('PROPAGATION', 'Event Mesh', 'Broadcasting: identity.attribute.updated [HASHED NIK USED]');
      await wait(1500);
      setStep(7);
      addEvent('PROPAGATION', 'Agencies', 'Verifiers receive notification of update via Event Mesh');
    }

    if (activeScenario === 'bpjs-check') {
      addEvent('PRESENTATION', 'Bank', 'Submitting VP (Selective Disclosure) | NO RAW DATA SHARED');
      await wait(1500);
      setStep(5);
      addEvent('PRESENTATION', 'Bank', 'Verifier Validating Proof via TRUST REGISTRY');
      await wait(1500);
      setStep(6);
      addEvent('CONSENT', 'Bank', 'Proof Validated: Citizen is ELIGIBLE. Privacy preserved.');
    }

    if (activeScenario === 'kemensos-eligibility') {
      addEvent('PRESENTATION', 'Kemensos', 'Presenting Selective Claims: [incomeLevel, employmentStatus]');
      await wait(1500);
      setStep(5);
      addEvent('PRESENTATION', 'Kemensos', 'BBS+ PREDICATE VERIFIED against TRUST REGISTRY');
      await wait(1500);
      setStep(6);
      addEvent('PROPAGATION', 'Event Mesh', 'Broadcast: aid.eligibility.verified [HASHED NIK USED]');
    }

    if (activeScenario === 'new-provider-request') {
      addEvent('PRESENTATION', 'PrivyID', 'Presenting IdentityVC (Selective) | SIGNED BY ISSUER (Dukcapil)');
      await wait(1500);
      setStep(5);
      addEvent('PRESENTATION', 'PrivyID', 'Resolving Issuer DID & Checking REVOCATION via Trust Registry');
      await wait(1500);
      setStep(6);
      addEvent('CONSENT', 'PrivyID', 'Identity Verified Successfully. Session Active.');
    }

    if (activeScenario === 'pmt-scoring') {
      addEvent('PRESENTATION', 'Kemensos', 'Receiving VP: Education + Identity + Health claims');
      await wait(1500);
      setStep(5);
      addEvent('PRESENTATION', 'Kemensos', 'Starting PMT Algorithm Analysis...');
      setShowPMT(true);
      
      // Simulate calculation steps
      await wait(1000);
      setPmtScore({ desil: 1, raw: 84.5 });
      addEvent('ISSUANCE', 'DTSEN', 'DTSEN Update: Socio-Economic status calculated: DESIL 1');
      await wait(2000);
      setStep(6);
      addEvent('PROPAGATION', 'Event Mesh', 'Broadcast: DTSEN.DesilStatus.Updated [HASHED NIK]');
    }

    setIsSimulating(false);
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div className="flex flex-col h-screen bg-immersive-bg text-immersive-text font-sans overflow-hidden border border-immersive-edge">
      
      {/* --- Header --- */}
      <header className="h-[60px] bg-gradient-to-r from-[#0F172A] to-[#020617] border-b border-immersive-edge flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="font-black text-xl tracking-tighter text-immersive-accent">IDCHAIN <span className="text-white">CORE</span></div>
          <div className="h-5 w-px bg-immersive-edge"></div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-immersive-dim font-bold">
            <span className="w-2 h-2 rounded-full bg-immersive-success shadow-[0_0_8px_var(--color-immersive-success)]"></span>
            FEDERATED MESH ACTIVE
          </div>
        </div>
        <div className="flex items-center gap-5 text-[10px] text-immersive-dim font-bold uppercase tracking-widest">
           <span>TRUST REGISTRY: v4.1</span>
           <span className="h-3 w-px bg-immersive-edge hidden sm:block"></span>
           <span className="hidden sm:block">BBS+ ENABLED</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* --- Sidebar Nav (Panel 1) --- */}
        <aside className="w-72 bg-immersive-bg border-r border-immersive-edge flex flex-col p-5 gap-6 overflow-y-auto shrink-0">
          <section>
            <h2 className="text-[11px] font-bold text-immersive-dim uppercase tracking-widest mb-4 border-l-2 border-immersive-accent pl-2">Citizen Wallet</h2>
            <div className="flex flex-col gap-3">
              {credentials.map(vc => (
                <div key={vc.id} className="bg-immersive-card border border-immersive-border rounded-xl p-4 transition-all hover:border-immersive-accent hover:shadow-immersive-glow group cursor-pointer" onClick={() => setShowWallet(true)}>
                  <div className="text-[9px] bg-blue-500/10 text-immersive-accent px-1.5 py-0.5 rounded font-bold inline-block mb-2 uppercase tracking-wide">{vc.type}</div>
                  <p className="text-xs font-bold text-immersive-text mb-0.5 line-clamp-1">{vc.id === 'vc-001' ? 'NIK: 3578********0001' : vc.claims.gelar || vc.claims.status}</p>
                  <p className="text-[10px] text-immersive-dim truncate">Issuer: {vc.issuer.split(':').pop()}</p>
                </div>
              ))}
              <div className="bg-[#000] border border-immersive-edge rounded-lg p-3 font-mono text-[9px] text-immersive-dim leading-relaxed">
{`{
  "type": "VerifiablePresentation",
  "holder": "did:idchain:v2_a3f2...",
  "proof": { "type": "BBS+" }
}`}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-bold text-immersive-dim uppercase tracking-widest mb-4 border-l-2 border-immersive-accent pl-2">Scenario Engine</h2>
            <div className="flex flex-col gap-2">
              <ScenarioBtn 
                onClick={() => runScenario('name-change')} 
                active={activeScenario === 'name-change'}
                label="Scenario A: Name Change"
                desc="Court Approval → Wallet → Dukcapil"
              />
              <ScenarioBtn 
                onClick={() => runScenario('edu-upgrade')} 
                active={activeScenario === 'edu-upgrade'}
                label="Scenario B: Education"
                desc="University → Wallet → Agency Update"
              />
              <ScenarioBtn 
                onClick={() => runScenario('bpjs-check')} 
                active={activeScenario === 'bpjs-check'}
                label="Scenario C: Selective Disclosure"
                desc="Bank check via ZK predicate proof"
              />
              <ScenarioBtn 
                onClick={() => runScenario('kemensos-eligibility')} 
                active={activeScenario === 'kemensos-eligibility'}
                label="Scenario D: Social Aid"
                desc="Kemensos PKH eligibility (BBS+)"
              />
              <ScenarioBtn 
                onClick={() => runScenario('new-provider-request')} 
                active={activeScenario === 'new-provider-request'}
                label="Scenario E: KYC Flow"
                desc="PrivyID Identity Verification"
              />
              <ScenarioBtn 
                onClick={() => runScenario('pmt-scoring')} 
                active={activeScenario === 'pmt-scoring'}
                label="Scenario F: PMT Scoring"
                desc="Kemensos DTSEN Desil Calculation"
              />
            </div>
          </section>

          <div className="mt-auto pt-5 flex flex-wrap gap-2">
            <div className="text-[9px] px-2 py-1 rounded border border-immersive-dim text-immersive-dim font-bold uppercase tracking-widest">UU PDP COMPLIANT</div>
            <div className="text-[9px] px-2 py-1 rounded border border-immersive-success text-immersive-success font-bold uppercase tracking-widest">CONSENTED</div>
          </div>
        </aside>

        {/* --- Main View --- */}
        <main className="flex-1 relative bg-[radial-gradient(circle_at_center,#0F172A_0%,#050508_100%)] overflow-hidden">
          
          {/* -- Interactive Diagram -- */}
          <div className="w-full h-full relative">
            {/* Grid Pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-5 pointer-events-none">
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Lines */}
            {/* Scenario A: Name Change */}
            <FlowLine from={AGENCIES.ma.pos} to={{x:50, y:62}} active={activeScenario === 'name-change' && step === 2} />
            <FlowLine from={{x:50, y:62}} to={AGENCIES.dukcapil.pos} active={activeScenario === 'name-change' && step === 4} />
            <FlowLine from={AGENCIES.dukcapil.pos} to={AGENCIES.bpjs.pos} active={activeScenario === 'name-change' && step >= 6} />
            <FlowLine from={AGENCIES.dukcapil.pos} to={AGENCIES.bank.pos} active={activeScenario === 'name-change' && step >= 6} />

            {/* Scenario B: Education */}
            <FlowLine from={AGENCIES.kemdikbud.pos} to={{x:50, y:62}} active={activeScenario === 'edu-upgrade' && step === 2} />

            {/* Scenario C: Selective Disclosure (BPJS) */}
            <FlowLine from={{x:50, y:62}} to={AGENCIES.bpjs.pos} active={activeScenario === 'bpjs-check' && step >= 4} />
            <FlowLine from={AGENCIES.bpjs.pos} to={AGENCIES.bank.pos} active={activeScenario === 'bpjs-check' && step >= 5} />

            {/* Scenario D: Kemensos */}
            <FlowLine from={{x:50, y:62}} to={AGENCIES.kemensos.pos} active={activeScenario === 'kemensos-eligibility' && step >= 4} />

            {/* Scenario E: PrivyID */}
            <FlowLine from={{x:50, y:62}} to={AGENCIES['service-provider'].pos} active={activeScenario === 'new-provider-request' && step >= 4} />

            {/* Scenario F: PMT Scoring (Kemensos gathering from issuers) */}
            <FlowLine from={{x:50, y:62}} to={AGENCIES.kemensos.pos} active={activeScenario === 'pmt-scoring' && (step === 2 || step >= 4)} />
            <FlowLine from={AGENCIES.dukcapil.pos} to={AGENCIES.kemensos.pos} active={activeScenario === 'pmt-scoring' && step === 5} />
            <FlowLine from={AGENCIES.kemdikbud.pos} to={AGENCIES.kemensos.pos} active={activeScenario === 'pmt-scoring' && step === 5} />
            <FlowLine from={AGENCIES.bpjs.pos} to={AGENCIES.kemensos.pos} active={activeScenario === 'pmt-scoring' && step === 5} />

            {/* Trust Registry Checks (Implicitly active when verifiers check) */}
            <FlowLine from={AGENCIES.bank.pos} to={AGENCIES['trust-registry'].pos} active={(activeScenario === 'bpjs-check' || activeScenario === 'name-change') && step === 5} />
            <FlowLine from={AGENCIES['service-provider'].pos} to={AGENCIES['trust-registry'].pos} active={activeScenario === 'new-provider-request' && step === 5} />

            {/* Central Node: CITIZEN */}
            <motion.div 
              className="absolute left-1/2 top-[62%] -translate-x-1/2 -translate-y-1/2 z-20"
              initial={false}
              animate={{ scale: isSimulating ? 1.1 : 1 }}
            >
              <div 
                className="w-32 h-32 rounded-full bg-immersive-card border-2 border-immersive-accent flex flex-col items-center justify-center gap-2 cursor-pointer shadow-immersive-strong-glow hover:scale-105 transition-transform"
                onClick={() => setShowWallet(true)}
              >
                <div className="text-3xl">👤</div>
                <span className="text-[11px] font-bold text-white uppercase tracking-widest">Citizen</span>
                <span className="text-[8px] text-immersive-dim uppercase font-bold tracking-tighter">Data Controller</span>
              </div>
            </motion.div>

            {/* Agency Nodes */}
            {(Object.entries(AGENCIES) as [AgencyId, typeof AGENCIES[AgencyId]][]).map(([id, agency]) => {
              const AgencyNode = Node as any;
              const isRegistryChecked = (activeScenario === 'bpjs-check' || activeScenario === 'name-change' || activeScenario === 'new-provider-request') && step === 5;
              
              const isActive = (activeScenario === 'name-change' && (
                (id === 'ma' && step >= 1) || 
                (id === 'dukcapil' && step >= 4) ||
                (id === 'bpjs' && step >= 6) ||
                (id === 'bank' && step >= 6)
              )) || (activeScenario === 'bpjs-check' && (
                (id === 'bank' && step >= 1) ||
                (id === 'bpjs' && step >= 4)
              )) || (activeScenario === 'kemensos-eligibility' && (
                (id === 'kemensos' && step >= 1)
              )) || (activeScenario === 'new-provider-request' && (
                (id === 'service-provider' && step >= 1)
              )) || (activeScenario === 'pmt-scoring' && (
                (id === 'kemensos' && (step === 1 || step >= 4)) ||
                (id === 'dukcapil' && step >= 5) ||
                (id === 'kemdikbud' && step >= 5) ||
                (id === 'bpjs' && step >= 5)
              )) || (id === 'trust-registry' && isRegistryChecked);
              
              return (
                <AgencyNode 
                  key={id} 
                  agency={agency} 
                  active={isActive}
                  onClick={() => id === 'trust-registry' ? setShowRegistry(true) : null}
                />
              );
            })}

            {/* BBS+ Disclosure Overlay (Contextual) */}
            <AnimatePresence>
              {activeScenario === 'bpjs-check' && step >= 4 && (
                <motion.div 
                  className="absolute bottom-[220px] left-1/2 -translate-x-1/2 w-[380px] bg-immersive-card border border-immersive-accent rounded-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <div className="text-xs font-bold mb-3 flex justify-between items-center">
                    <span className="tracking-widest uppercase text-immersive-accent">BBS+ SELECTIVE DISCLOSURE</span>
                    <span className="text-immersive-success flex items-center gap-1 font-mono text-[9px]">SECURE</span>
                  </div>
                  <div className="text-[11px] text-immersive-dim mb-4 leading-relaxed">
                    Himbara Bank requests proof of [Eligibility = Active]. Minimal attributes will be disclosed.
                    <span className="block mt-1 text-[9px] font-bold text-immersive-accent tracking-tighter uppercase">NO RAW DATA SHARED</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] p-2 bg-black rounded border border-immersive-border/30">
                      <span className="text-immersive-text">Status: Eligible</span>
                      <span className="text-immersive-success font-bold">✓ REVEALED</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] p-2 bg-black rounded border border-immersive-border/10 opacity-30 italic">
                      <span className="text-immersive-dim">Sensitive: Claim Details</span>
                      <span className="text-immersive-dim">HIDDEN</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {showRegistry && (
                <motion.div 
                  className="absolute inset-x-[10%] inset-y-[10%] bg-immersive-bg/95 border-2 border-immersive-accent rounded-3xl z-[150] shadow-2xl p-10 overflow-hidden"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Network Trust Registry</h2>
                      <p className="text-immersive-dim text-sm uppercase tracking-widest font-bold">Verifiable Data Infrastructure Root</p>
                    </div>
                    <button onClick={() => setShowRegistry(false)} className="p-3 rounded-full hover:bg-white/10 text-immersive-dim hover:text-white transition-colors">
                      <ChevronRight className="rotate-90" size={32} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-8 h-full">
                    <div className="space-y-6">
                      <h3 className="text-xs font-black text-immersive-accent uppercase tracking-widest border-b border-immersive-edge pb-2">Registered Issuers</h3>
                      <div className="grid gap-3">
                        {Object.entries(AGENCIES).filter(([,a]) => a.role === 'ISSUER').map(([id, agency]) => (
                          <div key={id} className="p-4 bg-immersive-card border border-immersive-edge rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-immersive-accent">{agency.icon}</span>
                              <span className="text-xs font-bold text-white uppercase">{agency.name}</span>
                            </div>
                            <span className="text-[9px] px-2 py-1 bg-immersive-success/20 text-immersive-success rounded font-black tracking-widest uppercase">STABLE</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-black/50 border border-immersive-edge rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                        <DatabaseZap size={150} />
                      </div>
                      <h3 className="text-xs font-black text-immersive-accent uppercase tracking-widest mb-6">Validation Process Simulation</h3>
                      <div className="space-y-4 font-mono text-[10px]">
                        <div className="flex gap-4 items-center">
                          <div className="w-2 h-2 rounded-full bg-immersive-success" />
                          <span className="text-immersive-dim">1. FETCH DID RESOLUTION FOR ISSUER (did:web:...)</span>
                        </div>
                        <div className="flex gap-4 items-center">
                          <div className="w-2 h-2 rounded-full bg-immersive-success" />
                          <span className="text-immersive-dim">2. DOWNLOAD PUBLIC KEY FROM TRUST REGISTRY</span>
                        </div>
                        <div className="flex gap-4 items-center">
                          <div className="w-2 h-2 rounded-full bg-immersive-accent animate-pulse" />
                          <span className="text-white font-bold tracking-tighter uppercase">3. VERIFY BBS+ CRYPTOGRAPHIC SIGNATURE</span>
                        </div>
                        <div className="flex gap-4 items-center">
                          <div className="w-2 h-2 rounded-full bg-immersive-dim" />
                          <span className="text-immersive-dim italic uppercase tracking-widest opacity-30">4. CHECK REVOCATION LIST STATUS</span>
                        </div>
                      </div>
                      <div className="mt-12 p-5 border border-immersive-accent/30 bg-immersive-accent/5 rounded-xl">
                        <p className="text-[11px] text-immersive-text leading-relaxed">
                          The Trust Registry ensures that only authorized entities can issue credentials and that all cryptographic proofs originate from verified keys.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {showPMT && (
                <motion.div 
                  className="absolute inset-[10%] bg-[#050508]/98 border-2 border-red-500/50 rounded-3xl z-[160] shadow-[0_0_100px_rgba(239,68,68,0.2)] p-10 flex flex-col overflow-hidden"
                  initial={{ opacity: 0, scale: 0.9, y: 50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 50 }}
                >
                  <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/10">
                    <div>
                      <h2 className="text-3xl font-black text-white flex items-center gap-4">
                        <Scale className="text-red-500" size={32} />
                        PROXY MEANS TEST (PMT)
                      </h2>
                      <p className="text-immersive-dim uppercase tracking-[0.3em] text-xs mt-2">DTSEN Real-time Socio-Economic Scoring</p>
                    </div>
                    <button onClick={() => setShowPMT(false)} className="p-3 text-immersive-dim hover:text-white transition-colors">
                       <ChevronRight className="rotate-90" size={32} />
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-3 gap-10 min-h-0 overflow-y-auto pr-4">
                    <div className="col-span-2 space-y-8">
                       <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                          <h3 className="text-xs font-black text-red-400 uppercase tracking-widest mb-6">Algorithm Weighting</h3>
                          <div className="space-y-6">
                             <div className="group">
                                <div className="flex justify-between text-[11px] mb-2 uppercase font-bold tracking-tighter">
                                   <span className="text-immersive-dim">Education Index (VP: EducationVC)</span>
                                   <span className="text-white">+ 0.35</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                   <motion.div className="h-full bg-red-500" initial={{ width: 0 }} animate={{ width: '35%' }} transition={{ duration: 1.5 }} />
                                </div>
                             </div>
                             <div className="group">
                                <div className="flex justify-between text-[11px] mb-2 uppercase font-bold tracking-tighter">
                                   <span className="text-immersive-dim">Demographic Weight (VP: IdentityVC)</span>
                                   <span className="text-white">+ 0.25</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                   <motion.div className="h-full bg-red-400" initial={{ width: 0 }} animate={{ width: '25%' }} transition={{ duration: 1.5, delay: 0.3 }} />
                                </div>
                             </div>
                             <div className="group">
                                <div className="flex justify-between text-[11px] mb-2 uppercase font-bold tracking-tighter">
                                   <span className="text-immersive-dim">Social Support History (VP: HealthVC)</span>
                                   <span className="text-white">+ 0.40</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                   <motion.div className="h-full bg-red-600" initial={{ width: 0 }} animate={{ width: '40%' }} transition={{ duration: 1.5, delay: 0.6 }} />
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-[10px] space-y-3 leading-relaxed">
                          <p className="text-green-500 flex gap-2"><span>[OK]</span> VP Claims verified via Trust Registry</p>
                          <p className="text-blue-400 flex gap-2"><span>[CALC]</span> Running Multi-Linear Regression Model v5.2</p>
                          <p className="text-white flex gap-2"><span>[DATA]</span> NIK-ID: 3578...01 Verified. No Direct DB Leak.</p>
                          <motion.p 
                            className="text-red-500 font-bold"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 0.5 }}
                          >
                            [RESULT] PMT SCORE: 84.50 | CLASSIFICATION: ULTRA-POOR (DESIL 1)
                          </motion.p>
                       </div>
                    </div>

                    <div className="bg-gradient-to-b from-red-500/20 to-transparent border border-red-500/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                       <motion.div 
                         className="w-32 h-32 rounded-full border-4 border-red-500 flex items-center justify-center mb-6 relative"
                         initial={{ scale: 0.8, rotate: -180 }}
                         animate={{ scale: 1, rotate: 0 }}
                         transition={{ type: 'spring', damping: 12 }}
                       >
                          <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                          <span className="text-5xl font-black text-white leading-none">{pmtScore?.desil || '?'}</span>
                       </motion.div>
                       <h4 className="text-xl font-bold text-white uppercase tracking-tighter mb-2">DESIL {pmtScore?.desil || '?'}</h4>
                       <p className="text-immersive-dim uppercase tracking-widest text-[9px] font-black border-t border-white/10 pt-4 w-full">Socio-Economic Bracket</p>
                       <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                          <div className="bg-black/60 p-3 rounded-xl border border-white/5">
                             <p className="text-[8px] text-immersive-dim uppercase mb-1">Score</p>
                             <p className="text-xs font-bold text-white">{pmtScore?.raw || '--'}</p>
                          </div>
                          <div className="bg-black/60 p-3 rounded-xl border border-white/5">
                             <p className="text-[8px] text-immersive-dim uppercase mb-1">Status</p>
                             <p className="text-xs font-bold text-red-500">ELIGIBLE</p>
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* --- Global Event Mesh Ledger (Bottom Panel) --- */}
          <div className="absolute bottom-0 left-0 right-0 h-[180px] bg-[#0F172A]/90 backdrop-blur-md border-t border-immersive-edge flex flex-col overflow-hidden z-30">
            <div className="p-3 px-6 border-b border-immersive-edge flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-immersive-accent">Global Event Mesh Ledger</span>
              <div className="flex gap-2">
                <span className="text-[9px] font-mono text-immersive-dim">SHARD: ID-WEST-1</span>
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-immersive-accent animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-immersive-accent/30" />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide font-mono text-[10px]">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-10 italic uppercase tracking-widest text-xs">
                  Awaiting Telemetry...
                </div>
              ) : (
                events.map(ev => (
                  <div key={ev.id} className="flex gap-6 px-4 py-1.5 border-b border-white/5 hover:bg-white/5 transition-colors">
                    <span className="text-immersive-dim shrink-0">{ev.timestamp}</span>
                    <span className="text-immersive-accent font-bold uppercase shrink-0 w-[110px]">[{ev.type}]</span>
                    <span className="text-immersive-text overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="text-blue-400 font-bold">{ev.actor}:</span> {ev.details}
                    </span>
                    <span className="ml-auto text-immersive-success opacity-50 font-bold uppercase text-[8px]">Verified</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

        {/* --- Consent Modal --- */}
        <AnimatePresence>
          {consentRequest && (
            <motion.div 
              className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="w-full max-w-sm bg-immersive-card border border-immersive-accent rounded-2xl p-8 shadow-2xl"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-immersive-accent/10 border border-immersive-accent/20">
                    <Shield className="text-immersive-accent" size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-tight">Consent Request</h3>
                    <p className="text-[9px] text-immersive-accent font-black tracking-widest uppercase">Encryption Established</p>
                  </div>
                </div>

                <div className="p-5 bg-black border border-immersive-edge rounded-xl mb-6 flex flex-col gap-5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-immersive-dim uppercase font-bold tracking-wider">Requester</span>
                    <span className="font-black text-white uppercase flex items-center gap-2">
                       {AGENCIES[consentRequest.agency].name}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-immersive-dim text-[10px] uppercase font-bold tracking-wider">Requested Attributes</span>
                    <div className="flex flex-wrap gap-2">
                      {consentRequest.claims.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-immersive-accent/10 border border-immersive-accent/20 rounded text-[9px] font-mono text-immersive-accent font-bold uppercase">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-[11px] text-immersive-dim border-t border-immersive-edge pt-4 leading-relaxed">
                    <strong className="text-white block mb-1 uppercase text-[9px]">Justification:</strong>
                    {consentRequest.purpose}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleConsent(false)}
                    className="flex-1 py-3 rounded-xl border border-immersive-edge hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-immersive-dim"
                  >
                    Deny
                  </button>
                  <button 
                    onClick={() => handleConsent(true)}
                    className="flex-1 py-3 rounded-xl bg-immersive-accent hover:bg-blue-500 shadow-immersive-strong-glow transition-all text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2"
                  >
                    Authorize Access
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Citizen Wallet Overlay --- */}
        <AnimatePresence>
          {showWallet && (
            <motion.div 
              className="absolute inset-y-0 right-0 w-[400px] bg-immersive-card border-l border-immersive-edge z-[110] flex flex-col shadow-[-20px_0_100px_rgba(0,0,0,0.8)]"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="p-6 border-b border-immersive-edge flex items-center justify-between bg-black/10">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-immersive-accent" size={20} />
                  <h3 className="font-black text-xs text-white uppercase tracking-widest">Digital Vault</h3>
                </div>
                <button onClick={() => setShowWallet(false)} className="text-immersive-dim hover:text-white transition-colors">
                  <ChevronRight size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 scrollbar-hide">
                <div className="p-6 bg-gradient-to-br from-immersive-accent/15 to-transparent border border-immersive-accent/30 rounded-2xl flex flex-col gap-2 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                    <Fingerprint size={80} />
                  </div>
                  <span className="text-[10px] font-mono text-immersive-accent uppercase tracking-widest font-black">Sovereign Identity Anchor</span>
                  <p className="text-xs font-mono text-white/90 break-all leading-relaxed tracking-tight">did:idchain:v2_{Math.random().toString(16).slice(2, 10)}...</p>
                  <div className="mt-3 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-immersive-success/15 border border-immersive-success/20 text-[9px] text-immersive-success font-black tracking-widest uppercase">Verified IAL3</span>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-[11px] font-black text-immersive-dim uppercase tracking-[0.2em] mb-4 border-l-2 border-immersive-accent pl-2">
                    {vpGenerationMode ? 'Attribute Selection' : 'Protected Objects'}
                  </h4>
                  <div className="flex flex-col gap-4">
                    {vpGenerationMode ? (
                      <div className="space-y-4">
                        {credentials.filter(vc => vc.id === vpGenerationMode).map(vc => (
                          <div key={vc.id} className="p-6 bg-black border border-immersive-accent rounded-2xl">
                             <div className="flex items-center gap-3 mb-6">
                               <div className="p-2 bg-immersive-accent/10 rounded-lg">
                                  <Lock size={16} className="text-immersive-accent" />
                               </div>
                               <h5 className="text-white font-bold text-sm uppercase tracking-tight">{vc.type}</h5>
                             </div>
                             
                             <div className="space-y-3 mb-8">
                                {Object.entries(vc.claims).map(([key, val]) => (
                                  <label key={key} className="flex items-center justify-between p-3 border border-immersive-edge rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                                     <div className="flex flex-col">
                                       <span className="text-[9px] text-immersive-dim font-bold uppercase tracking-wider">{key}</span>
                                       <span className="text-[11px] text-white font-mono">{val}</span>
                                     </div>
                                     <input 
                                        type="checkbox" 
                                        className="w-5 h-5 accent-immersive-accent"
                                        checked={!!selectedAttributes[key]}
                                        onChange={(e) => setSelectedAttributes(prev => ({...prev, [key]: e.target.checked}))}
                                     />
                                  </label>
                                ))}
                             </div>

                             <div className="bg-immersive-accent/5 border border-immersive-accent/20 rounded-xl p-4 mb-6">
                               <div className="flex items-center gap-2 text-immersive-accent mb-2">
                                  <EyeOff size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">BBS+ Selective Disclosure Info</span>
                               </div>
                               <p className="text-[10px] text-immersive-dim leading-relaxed italic">
                                  By selecting only specific attributes, you generate a derived proof that hides all other sensitive data. The signature remains cryptographically tied to the original issuer.
                               </p>
                             </div>

                             <div className="flex gap-3">
                               <button 
                                  onClick={() => { setVpGenerationMode(null); setSelectedAttributes({}); }}
                                  className="flex-1 py-3 border border-immersive-edge rounded-xl text-[10px] font-black uppercase tracking-widest text-immersive-dim"
                               >
                                  Cancel
                               </button>
                               <button 
                                  onClick={() => {
                                    const disclosedCount = Object.values(selectedAttributes).filter(Boolean).length;
                                    addEvent('PRESENTATION', 'Wallet', `Generated VP with ${disclosedCount} attributes [SIGNED BY ISSUER]`);
                                    setVpGenerationMode(null);
                                    setSelectedAttributes({});
                                    setShowWallet(false);
                                  }}
                                  className="flex-[2] py-3 bg-immersive-accent shadow-immersive-glow rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-immersive-glow hover:bg-opacity-80 transition-all"
                               >
                                  Generate & Share VP
                               </button>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      credentials.map(vc => (
                        <div key={vc.id} className="p-5 bg-black/40 border border-immersive-edge rounded-2xl hover:border-immersive-accent transition-all group overflow-hidden relative">
                          <div className="flex justify-between items-start mb-4">
                            <div className="z-10">
                              <span className="text-[9px] font-black text-immersive-accent uppercase tracking-widest mb-1.5 block">{vc.type}</span>
                              <p className="text-sm font-bold text-white group-hover:text-immersive-accent transition-colors">
                                 {vc.type === 'IdentityCredential' ? 'National Identity Card' : 
                                  vc.type === 'EducationCredential' ? 'Academic Diploma' : 'Health Insurance Card'}
                              </p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-immersive-success/10 border border-immersive-success/20 flex items-center justify-center">
                              <CheckCircle2 size={16} className="text-immersive-success" />
                            </div>
                          </div>
                          <div className="space-y-2.5 mb-5 border-y border-white/5 py-4">
                            {Object.entries(vc.claims).slice(0, 4).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center text-[10px]">
                                <span className="text-immersive-dim font-bold uppercase tracking-tighter">{k}</span>
                                <span className="text-white/80 font-mono italic">{v}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setVpGenerationMode(vc.id)}
                              className="flex-1 py-2.5 bg-immersive-accent text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-500 transition-colors shadow-immersive-glow"
                            >
                              Share Selective Data
                            </button>
                            <button className="py-2.5 px-4 bg-white/5 border border-immersive-edge rounded-lg text-white/50 hover:text-white transition-colors">
                              <Lock size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* --- Overlay Styles --- */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// --- Helper Components ---

function ScenarioBtn({ active, label, desc, onClick }: { active: boolean; label: string; desc: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex flex-col gap-1 p-4 rounded-xl border transition-all text-left group ${active ? 'bg-immersive-card border-immersive-accent shadow-immersive-glow scale-[1.02]' : 'bg-immersive-card border-immersive-edge hover:border-immersive-accent/30'}`}
    >
      <span className={`text-[12px] font-bold transition-colors ${active ? 'text-immersive-accent' : 'text-immersive-text group-hover:text-immersive-accent'}`}>{label}</span>
      <span className={`text-[10px] transition-colors leading-relaxed ${active ? 'text-white/70' : 'text-immersive-dim'}`}>{desc}</span>
    </button>
  );
}

function ComponentBtn({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-immersive-card border border-immersive-edge text-immersive-dim hover:border-immersive-accent/40 hover:text-immersive-accent transition-all text-left mb-2 group shadow-sm">
      <div className="text-immersive-dim group-hover:text-immersive-accent transition-colors">{icon}</div>
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2 bg-immersive-card border border-immersive-edge rounded-xl backdrop-blur-xl shrink-0 min-w-[100px]">
      <p className="text-[9px] font-black text-immersive-dim uppercase tracking-[0.1em] mb-0.5">{label}</p>
      <p className="text-xs font-bold text-immersive-text">{value}</p>
    </div>
  );
}

function getEvColor(type: SystemEvent['type']) {
  switch (type) {
    case 'ISSUANCE': return 'text-purple-400';
    case 'PRESENTATION': return 'text-immersive-accent';
    case 'CONSENT': return 'text-immersive-success';
    case 'PROPAGATION': return 'text-amber-400';
    default: return 'text-immersive-dim';
  }
}
