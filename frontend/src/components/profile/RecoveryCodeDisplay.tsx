import { useState } from 'react';

interface RecoveryCodeDisplayProps {
  code: string;
  onContinue: () => void;
}

export function RecoveryCodeDisplay({ code, onContinue }: RecoveryCodeDisplayProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const chars = code.split('');

  return (
    <div className="rc-page">
      <div className="rc-grid" />
      <div className="rc-ambient" aria-hidden="true">
        <svg viewBox="0 0 1400 900" preserveAspectRatio="none">
          <line x1="11%" y1="29%" x2="34%" y2="46%" />
          <line x1="34%" y1="46%" x2="50%" y2="52%" />
          <line x1="50%" y1="52%" x2="86%" y2="25%" />
          <line x1="50%" y1="52%" x2="77%" y2="83%" />
          <line x1="21%" y1="84%" x2="50%" y2="52%" />
        </svg>
        <div className="rc-node rc-n1" />
        <div className="rc-node green rc-n2" />
        <div className="rc-node rc-n3" />
        <div className="rc-node rc-n4" />
      </div>

      <header className="rc-header">
        <div className="rc-logo">NODO<b>●</b></div>
        <div className="rc-live"><i />The network is live</div>
      </header>

      <main className="rc-main">
        <div className="rc-layout">
          {/* Left aside */}
          <aside className="rc-side rc-left" aria-hidden="true">
            <div className="rc-mini" />
            <div className="rc-label">Identity node</div>
            <div className="rc-value">Profile created</div>
            <div className="rc-copy-text">Your profile is now part of the network.</div>
            <div className="rc-status"><i />CONNECTED</div>
          </aside>

          {/* Card */}
          <section className="rc-card">
            <div className="rc-glow" />
            <div className="rc-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                <circle cx="6" cy="6" r="2.3" />
                <circle cx="18" cy="6" r="2.3" />
                <circle cx="12" cy="18" r="2.3" />
                <path d="M8 7.2l7.7 0M7.2 8l3.7 7.5M16.8 8l-3.7 7.5" />
              </svg>
            </div>
            <div className="rc-eyebrow">Account recovery key</div>
            <h1 className="rc-title">Your recovery code</h1>
            <p className="rc-subtitle">This is the only way to recover your account. Save it somewhere safe before continuing.</p>

            <div className="rc-codebox">
              <div className="rc-codebox-top">
                <span className="rc-caption">Private recovery key</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`rc-copybtn ${copied ? 'rc-copied' : ''}`}
                >
                  {copied ? '✓ Copied' : 'Copy code'}
                </button>
              </div>
              <div className="rc-chars">
                {chars.map((char, i) => (
                  <div key={i} className="rc-char">{char}</div>
                ))}
              </div>
              <div className="rc-hint">6 characters · Keep this code private</div>
            </div>

            <div className="rc-warning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 22 20H2L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M12 9v5M12 17.5v.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span><strong>Save this code.</strong> It cannot be recovered or shown again.</span>
            </div>

            <label className="rc-confirm">
              <input
                type="checkbox"
                checked={saved}
                onChange={(e) => setSaved(e.target.checked)}
              />
              <span className="rc-check">
                <svg viewBox="0 0 12 12" fill="none">
                  <path d="m2.2 6.2 2.3 2.2 5.3-5" stroke="#041116" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="rc-confirm-text">I&apos;ve saved my recovery code somewhere safe</span>
            </label>

            <button
              className="rc-continue"
              disabled={!saved}
              onClick={onContinue}
            >
              Continue to Nodo
            </button>

            <div className="rc-footer"><b>●</b> Your identity is now connected to the network</div>
          </section>

          {/* Right aside */}
          <aside className="rc-side rc-right" aria-hidden="true">
            <div className="rc-label">Network access</div>
            <div className="rc-value">Recovery enabled</div>
            <div className="rc-copy-text">No password. Your recovery code is your key back into Nodo.</div>
            <div className="rc-status"><i />SECURED</div>
          </aside>
        </div>
      </main>

      <style>{`
        .rc-page{min-height:100vh;position:relative;isolation:isolate;background:radial-gradient(circle at 75% 20%,rgba(6,182,212,.09),transparent 27%),radial-gradient(circle at 20% 85%,rgba(52,211,153,.035),transparent 24%),#07080d;color:#f4f7fb;font-family:Inter,system-ui,sans-serif}
        .rc-grid{position:absolute;inset:0;z-index:-4;opacity:.5;background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(circle at 50% 48%,#000 8%,rgba(0,0,0,.8) 42%,transparent 82%);-webkit-mask-image:radial-gradient(circle at 50% 48%,#000 8%,rgba(0,0,0,.8) 42%,transparent 82%)}
        .rc-grid:after{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(103,232,249,.18) 1px,transparent 1px);background-size:56px 56px;opacity:.18}
        .rc-ambient{position:absolute;inset:0;z-index:-2;pointer-events:none}
        .rc-ambient svg{position:absolute;width:100%;height:100%}
        .rc-ambient line{stroke:rgba(6,182,212,.14);stroke-width:1;stroke-dasharray:4 10;animation:rc-dash 10s linear infinite}
        .rc-node{position:absolute;width:10px;height:10px;border-radius:50%;border:1px solid rgba(6,182,212,.55);background:rgba(6,182,212,.16);box-shadow:0 0 24px rgba(6,182,212,.18);animation:rc-float 7s ease-in-out infinite}
        .rc-node.green{border-color:rgba(52,211,153,.55);background:rgba(52,211,153,.12)}
        .rc-n1{left:11%;top:29%}.rc-n2{right:13%;top:25%;animation-delay:-4s}.rc-n3{right:23%;bottom:17%;animation-delay:-2s}.rc-n4{left:21%;bottom:16%;animation-delay:-5s}
        .rc-header{width:min(1280px,calc(100% - 56px));height:84px;margin:auto;display:flex;align-items:center;justify-content:space-between}
        .rc-logo{font-size:21px;font-weight:800;letter-spacing:-.06em}
        .rc-logo b{color:#06b6d4;font-size:10px;margin-left:3px;vertical-align:3px}
        .rc-live{display:flex;align-items:center;gap:8px;color:#657185;font-size:11px}
        .rc-live i{width:6px;height:6px;border-radius:50%;background:#34d399;box-shadow:0 0 14px rgba(52,211,153,.8);animation:rc-pulse 2s infinite;display:inline-block;margin-right:2px}
        .rc-main{width:min(1080px,calc(100% - 56px));min-height:calc(100vh - 84px);margin:auto;display:grid;place-items:center;padding:30px 0 70px}
        .rc-layout{width:100%;display:grid;grid-template-columns:190px minmax(0,520px) 190px;align-items:center;justify-content:center;gap:34px}
        .rc-side{min-height:250px;display:flex;flex-direction:column;justify-content:center;gap:12px;color:#526075}
        .rc-left{text-align:right;align-items:flex-end}
        .rc-right{text-align:left;align-items:flex-start}
        .rc-mini{width:34px;height:34px;border:1px solid rgba(6,182,212,.22);border-radius:50%;display:grid;place-items:center;position:relative}
        .rc-mini:before{content:"";width:7px;height:7px;border-radius:50%;background:#06b6d4;box-shadow:0 0 14px rgba(6,182,212,.7)}
        .rc-label{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
        .rc-value{font-size:12px;font-weight:600;color:#8290a5}
        .rc-copy-text{max-width:165px;font-size:10px;line-height:1.65;color:#485467}
        .rc-status{display:flex;align-items:center;gap:7px;font-size:9px}
        .rc-status i{width:5px;height:5px;border-radius:50%;background:#34d399;box-shadow:0 0 8px rgba(52,211,153,.65);display:inline-block}
        .rc-card{width:100%;position:relative;padding:38px;border:1px solid rgba(255,255,255,.085);border-radius:16px;background:rgba(13,15,23,.8);backdrop-filter:blur(16px);box-shadow:0 30px 100px rgba(0,0,0,.46),0 0 70px rgba(6,182,212,.055)}
        .rc-card:before{content:"";position:absolute;inset:-1px;border-radius:17px;padding:1px;background:linear-gradient(145deg,rgba(6,182,212,.4),rgba(255,255,255,.05) 35%,transparent 66%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
        .rc-glow{position:absolute;width:180px;height:100px;top:-45px;left:50%;transform:translateX(-50%);background:rgba(6,182,212,.1);filter:blur(50px);pointer-events:none}
        .rc-mark{width:52px;height:52px;margin:0 auto 20px;display:grid;place-items:center;border-radius:14px;border:1px solid rgba(6,182,212,.22);background:rgba(6,182,212,.055);box-shadow:0 0 35px rgba(6,182,212,.08)}
        .rc-mark svg{width:30px;height:30px}
        .rc-eyebrow{text-align:center;color:#06b6d4;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
        .rc-title{margin:8px 0 0;text-align:center;font-size:30px;line-height:1.05;letter-spacing:-.055em;font-weight:800}
        .rc-subtitle{max-width:390px;margin:12px auto 27px;text-align:center;color:#8995a8;font-size:12px;line-height:1.7}
        .rc-codebox{padding:16px;border:1px solid rgba(6,182,212,.16);border-radius:12px;background:linear-gradient(180deg,rgba(6,182,212,.035),rgba(255,255,255,.008)),rgba(9,12,18,.72);box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 0 40px rgba(6,182,212,.045)}
        .rc-codebox-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .rc-caption{color:#58667b;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
        .rc-copybtn{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.025);color:#8e9aad;border-radius:7px;padding:6px 10px;font-size:10px;font-weight:600;cursor:pointer;transition:.2s}
        .rc-copybtn:hover{color:#dbe7ef;border-color:rgba(6,182,212,.35);background:rgba(6,182,212,.06)}
        .rc-copied{color:#34d399!important;border-color:rgba(52,211,153,.25)!important}
        .rc-chars{display:grid;grid-template-columns:repeat(6,1fr);gap:7px}
        .rc-char{height:58px;display:grid;place-items:center;border-radius:8px;border:1px solid rgba(255,255,255,.075);background:#0d1119;color:#d9fbff;font-family:Consolas,monospace;font-size:21px;font-weight:800;text-shadow:0 0 18px rgba(6,182,212,.18)}
        .rc-hint{text-align:center;margin-top:10px;color:#465267;font-size:9px}
        .rc-warning{margin-top:17px;padding:12px 14px;display:flex;align-items:center;gap:10px;border:1px solid rgba(251,113,133,.16);border-radius:9px;background:rgba(251,113,133,.035)}
        .rc-warning svg{color:#fbbf24;flex:none}
        .rc-warning span{font-size:10px;line-height:1.5;color:#9d7880}
        .rc-warning strong{color:#fda4af}
        .rc-confirm{margin-top:20px;display:flex;align-items:center;gap:10px;padding:10px 4px;cursor:pointer}
        .rc-confirm input{position:absolute;opacity:0}
        .rc-check{width:18px;height:18px;flex:none;border:1px solid rgba(255,255,255,.16);border-radius:5px;background:#0d1119;display:grid;place-items:center}
        .rc-check svg{width:11px;opacity:0}
        .rc-confirm input:checked+.rc-check{border-color:#06b6d4;background:#06b6d4;box-shadow:0 0 16px rgba(6,182,212,.18)}
        .rc-confirm input:checked+.rc-check svg{opacity:1}
        .rc-confirm-text{color:#738198;font-size:11px}
        .rc-continue{width:100%;margin-top:12px;padding:13px 16px;border:0;border-radius:8px;background:#06b6d4;color:#041116;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 0 20px rgba(6,182,212,.2);transition:.2s}
        .rc-continue:disabled{cursor:not-allowed;background:#0b6878;color:#72939b;box-shadow:none;opacity:.72}
        .rc-continue:not(:disabled):hover{background:#22d3ee;transform:translateY(-1px);box-shadow:0 0 28px rgba(6,182,212,.28)}
        .rc-footer{text-align:center;margin-top:18px;color:#455165;font-size:9px}
        .rc-footer b{color:#06b6d4}
        @keyframes rc-pulse{50%{opacity:.4}}
        @keyframes rc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-13px)}}
        @keyframes rc-dash{to{stroke-dashoffset:-180}}
        @media(max-width:900px){.rc-layout{grid-template-columns:minmax(0,520px)}.rc-side{display:none}}
        @media(max-width:650px){.rc-header{width:calc(100% - 32px);height:70px}.rc-main{width:calc(100% - 32px);padding:20px 0 45px}.rc-card{padding:30px 20px 27px}.rc-title{font-size:28px}.rc-chars{gap:5px}.rc-char{height:52px;font-size:18px}}
      `}</style>
    </div>
  );
}
