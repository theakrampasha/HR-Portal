import { useState, useEffect } from 'react'

function Illustration({ onChairClick, activeView }) {
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 })
  const [hoveredRecruiter, setHoveredRecruiter] = useState(false)
  const [hoveredCandidate, setHoveredCandidate] = useState(false)
  const [hoveredChair, setHoveredChair] = useState(false)
  const [chairClicked, setChairClicked] = useState(false)

  // Track mouse movements to update recruiter's and candidate's eye pupils
  useEffect(() => {
    const handleMouseMove = (e) => {
      const svgElement = document.getElementById('hiring-svg')
      if (!svgElement) return
      
      const rect = svgElement.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const angle = Math.atan2(dy, dx)
      
      // Limit pupil movement range
      const limit = 3
      const distance = Math.min(limit, Math.sqrt(dx * dx + dy * dy) / 60)
      
      setPupilOffset({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Sync state with active view (e.g. if we switch to signup, highlight the chair)
  useEffect(() => {
    if (activeView === 'signup') {
      setChairClicked(true)
    } else {
      setChairClicked(false)
    }
  }, [activeView])

  const handleChairClickInternal = () => {
    setChairClicked(true)
    if (onChairClick) {
      onChairClick()
    }
  }

  return (
    <div className="illustration">
      <svg
        id="hiring-svg"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="illustration-svg"
        aria-label="Interactive HR hiring graphic"
      >
        <defs>
          {/* Title Text Gradient */}
          <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f5d4" />
            <stop offset="50%" stopColor="#00bbf9" />
            <stop offset="100%" stopColor="#7209b7" />
          </linearGradient>

          {/* Metal cylinder gradient */}
          <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Purple chair highlights */}
          <linearGradient id="chairGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
          
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* ── Background Grid & Decorative Elements ── */}
        <g opacity="0.4">
          <circle cx="300" cy="350" r="220" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
          <circle cx="300" cy="350" r="150" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
          <line x1="300" y1="130" x2="300" y2="570" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
          <line x1="80" y1="350" x2="520" y2="350" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
        </g>

        {/* Floating background glowing blobs */}
        <circle cx="100" cy="200" r="80" fill="#00bbf9" className="svg-blob" />
        <circle cx="500" cy="400" r="90" fill="#00f5d4" className="svg-blob" />

        {/* ── Header Title ── */}
        <text
          x="300"
          y="65"
          textAnchor="middle"
          fontSize="36"
          fontWeight="800"
          className="svg-title"
        >
          WE ARE HIRING!
        </text>

        {/* Floor shadow under everything */}
        <ellipse cx="300" cy="535" rx="220" ry="18" fill="rgba(0, 0, 0, 0.25)" />

        {/* ── Recruiter (Left Character) ── */}
        <g
          className="interactive-group recruiter-group"
          onMouseEnter={() => setHoveredRecruiter(true)}
          onMouseLeave={() => setHoveredRecruiter(false)}
        >
          {/* Recruiter Shadow */}
          <ellipse cx="140" cy="532" rx="40" ry="10" fill="rgba(0, 0, 0, 0.2)" />

          {/* Left leg */}
          <path d="M122 400 L112 518" stroke="#0a0f1d" strokeWidth="16" strokeLinecap="round" />
          {/* Right leg */}
          <path d="M152 400 L156 518" stroke="#0a0f1d" strokeWidth="16" strokeLinecap="round" />
          
          {/* Red/Brown Boots */}
          {/* Left shoe */}
          <path d="M112 516 L96 518 L90 527 L90 535 L116 535 L116 516 Z" fill="#b45309" />
          <path d="M88 531 H118 V535 H88 Z" fill="#ffffff" />
          <circle cx="92" cy="529" r="4" fill="#ffffff" />

          {/* Right shoe */}
          <path d="M156 516 L156 535 L180 535 L180 527 L174 518 L160 516 Z" fill="#b45309" />
          <path d="M154 531 H182 V535 H154 Z" fill="#ffffff" />
          <circle cx="178" cy="529" r="4" fill="#ffffff" />

          {/* Pants overlay */}
          <path d="M112 390 L162 390 L164 480 L146 480 L144 430 L130 430 L128 480 L110 480 Z" fill="#1e293b" />

          {/* Torso & Shirt */}
          <path d="M116 288 L158 288 L170 395 L104 395 Z" fill="#00bbf9" />
          <path d="M131 288 L137 312 L143 288" fill="#0096c7" />
          {/* Tie */}
          <path d="M136 295 L138 295 L141 370 L137 378 L133 370 Z" fill="#f72585" />
          {/* Pocket */}
          <rect x="116" y="315" width="14" height="18" fill="#0096c7" rx="2" />
          <line x1="116" y1="315" x2="130" y2="315" stroke="#ffffff" strokeWidth="1.5" />

          {/* Left sleeve & arm (resting) */}
          <path d="M118 290 L104 292 L94 330 L106 334 Z" fill="#00bbf9" />
          <path d="M98 332 L98 360 L108 360 L104 334 Z" fill="#ffd1ac" />

          {/* Welcoming Right sleeve & arm (points to chair) */}
          <g className="recruiter-arm">
            <path d="M156 290 L170 286 L188 322 L172 326 Z" fill="#00bbf9" />
            {/* White cuff */}
            <rect x="176" y="318" width="12" height="5" rx="1" fill="#ffffff" transform="rotate(20, 176, 318)" />
            {/* Forearm */}
            <path d="M180 322 L220 334 L216 344 L178 328 Z" fill="#ffd1ac" />
            {/* Welcoming hand */}
            <path d="M220 334 C226 335, 230 340, 235 336 C238 332, 235 327, 228 325 C225 324, 221 324, 220 326 Z" fill="#ffd1ac" />
          </g>

          {/* Head & Neck */}
          <rect x="131" y="268" width="12" height="22" fill="#ffd1ac" />
          
          <g className="recruiter-head">
            {/* Hair back */}
            <path d="M120 235 C115 235, 115 255, 120 260 Z" fill="#0f172a" />
            {/* Face */}
            <circle cx="137" cy="242" r="26" fill="#ffd1ac" />
            {/* Hair front */}
            <path d="M113 235 C113 208, 137 200, 155 205 C168 210, 172 228, 168 242 C158 242, 158 232, 144 232 C130 232, 126 242, 116 242 Z" fill="#0f172a" />
            
            {/* Eyes tracking */}
            {/* Left eye */}
            <ellipse cx="129" cy="240" rx="5" ry="3.5" fill="#ffffff" />
            <circle cx={129 + pupilOffset.x} cy={240 + pupilOffset.y} r="2" fill="#0f172a" />
            
            {/* Right eye */}
            <ellipse cx="145" cy="240" rx="5" ry="3.5" fill="#ffffff" />
            <circle cx={145 + pupilOffset.x} cy={240 + pupilOffset.y} r="2" fill="#0f172a" />

            {/* Glasses */}
            <rect x="122" y="234" width="14" height="11" rx="3" stroke="#0f172a" strokeWidth="2" fill="none" />
            <rect x="138" y="234" width="14" height="11" rx="3" stroke="#0f172a" strokeWidth="2" fill="none" />
            <line x1="136" y1="239" x2="138" y2="239" stroke="#0f172a" strokeWidth="2" />
            <path d="M122 239 L115 236" stroke="#0f172a" strokeWidth="2" />
            <path d="M152 239 L159 236" stroke="#0f172a" strokeWidth="2" />

            {/* Nose */}
            <path d="M136 242 L138 247 L135 248" stroke="#e2b493" strokeWidth="1.5" fill="none" />

            {/* Smile */}
            <path d="M131 254 Q137 261 143 254" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Blush */}
            <circle cx="118" cy="249" r="3" fill="#ff8a8a" opacity="0.4" />
            <circle cx="154" cy="249" r="3" fill="#ff8a8a" opacity="0.4" />
          </g>

          {/* Interactive Speech Bubble */}
          <g
            className="tooltip-box"
            style={{
              opacity: hoveredRecruiter ? 1 : 0,
              transform: hoveredRecruiter ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            {/* Bubble body */}
            <path
              d="M 50 115 A 12 12 0 0 1 62 103 L 188 103 A 12 12 0 0 1 200 115 L 200 165 A 12 12 0 0 1 188 177 L 150 177 L 140 193 L 132 177 L 62 177 A 12 12 0 0 1 50 165 Z"
              fill="#111827"
              stroke="#00f5d4"
              strokeWidth="2"
            />
            <text x="125" y="132" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600" fontFamily="Outfit">
              We need your
            </text>
            <text x="125" y="152" textAnchor="middle" fill="#00f5d4" fontSize="14" fontWeight="800" fontFamily="Outfit">
              super powers! ⚡
            </text>
          </g>
        </g>

        {/* ── Vacant Office Chair (Center Element) ── */}
        <g
          className={`interactive-group chair-group ${hoveredChair ? 'chair-hovered' : ''} ${chairClicked ? 'chair-selected' : ''}`}
          onClick={handleChairClickInternal}
          onMouseEnter={() => setHoveredChair(true)}
          onMouseLeave={() => setHoveredChair(false)}
        >
          {/* Chair Shadow (resizes on hover) */}
          <ellipse cx="300" cy="518" rx="70" ry="12" fill="rgba(0, 0, 0, 0.25)" className="chair-shadow" />

          <g className="chair-base-g">
            {/* Star Wheel Base */}
            {/* Star Legs */}
            <path d="M300 490 L240 508" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
            <path d="M300 490 L360 508" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
            <path d="M300 490 L300 520" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
            <path d="M300 490 L260 478" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
            <path d="M300 490 L340 478" stroke="#475569" strokeWidth="8" strokeLinecap="round" />

            {/* Wheels */}
            <circle cx="240" cy="508" r="9" fill="#0f172a" />
            <circle cx="240" cy="508" r="4" fill="#94a3b8" />
            
            <circle cx="360" cy="508" r="9" fill="#0f172a" />
            <circle cx="360" cy="508" r="4" fill="#94a3b8" />
            
            <circle cx="300" cy="520" r="9" fill="#0f172a" />
            <circle cx="300" cy="520" r="4" fill="#94a3b8" />
            
            <circle cx="260" cy="478" r="7" fill="#0f172a" />
            <circle cx="340" cy="478" r="7" fill="#0f172a" />

            {/* Hydraulic Lift column */}
            <rect x="294" y="415" width="12" height="78" fill="url(#metalGradient)" />
            <rect x="291" y="482" width="18" height="12" fill="#1e293b" rx="2" />

            {/* Backrest Structure & Seat Cushion */}
            {/* Left Armrest */}
            <path d="M225 380 L195 380 L195 320 L240 320" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M195 340 L195 380" stroke="#64748b" strokeWidth="4" />

            {/* Right Armrest */}
            <path d="M375 380 L405 380 L405 320 L360 320" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M405 340 L405 380" stroke="#64748b" strokeWidth="4" />

            {/* Seat Cushion */}
            <rect x="220" y="380" width="160" height="28" rx="8" fill="url(#chairGradient)" />
            <rect x="225" y="382" width="150" height="10" rx="4" fill="#a78bfa" opacity="0.3" />

            {/* High Backrest */}
            <rect x="235" y="200" width="130" height="180" rx="24" fill="#4c1d95" stroke="#2e1065" strokeWidth="2" />
            <rect x="245" y="210" width="110" height="160" rx="16" fill="url(#chairGradient)" />

            {/* Tufting buttons & lines */}
            <g opacity="0.4">
              <line x1="275" y1="245" x2="265" y2="290" stroke="#2e1065" strokeWidth="1.5" />
              <line x1="325" y1="245" x2="335" y2="290" stroke="#2e1065" strokeWidth="1.5" />
              <line x1="265" y1="290" x2="275" y2="335" stroke="#2e1065" strokeWidth="1.5" />
              <line x1="335" y1="290" x2="325" y2="335" stroke="#2e1065" strokeWidth="1.5" />
              <line x1="275" y1="245" x2="325" y2="245" stroke="#2e1065" strokeWidth="1.5" />
              <line x1="265" y1="290" x2="335" y2="290" stroke="#2e1065" strokeWidth="1.5" />
              <line x1="275" y1="335" x2="325" y2="335" stroke="#2e1065" strokeWidth="1.5" />
            </g>

            <circle cx="275" cy="245" r="4" fill="#1e1b4b" />
            <circle cx="325" cy="245" r="4" fill="#1e1b4b" />
            <circle cx="265" cy="290" r="4" fill="#1e1b4b" />
            <circle cx="335" cy="290" r="4" fill="#1e1b4b" />
            <circle cx="275" cy="335" r="4" fill="#1e1b4b" />
            <circle cx="325" cy="335" r="4" fill="#1e1b4b" />
          </g>

          {/* Hanging VACANT / APPLY NOW Sign */}
          <g className={`swing-sign-group ${hoveredChair || chairClicked ? 'swing-sign-active' : ''}`}>
            {/* Hanging String */}
            <path d="M265 240 L300 280 L335 240" stroke="#1e1b4b" strokeWidth="2" fill="none" />

            {/* Rotated Sign container */}
            <g transform="translate(300, 280) rotate(-10)">
              {/* Shadow */}
              <rect x="-75" y="0" width="150" height="46" rx="8" fill="rgba(0, 0, 0, 0.3)" transform="translate(4, 4)" />
              
              {/* Sign Board */}
              <rect
                x="-75"
                y="0"
                width="150"
                height="46"
                rx="8"
                fill={chairClicked ? 'url(#goldGradient)' : '#ef4444'}
                stroke="#ffffff"
                strokeWidth="2.5"
                style={{ transition: 'fill 0.4s ease' }}
              />
              
              {/* Border inner glow */}
              <rect x="-71" y="4" width="142" height="38" rx="5" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
              
              {/* Text */}
              <text
                x="0"
                y="29"
                textAnchor="middle"
                fontSize="17"
                fontWeight="900"
                fill="#ffffff"
                letterSpacing="1"
                fontFamily="Outfit"
              >
                {chairClicked ? 'YOUR SEAT!' : 'VACANT'}
              </text>
            </g>
          </g>

          {/* Interactive Seat Ring Highlight (Glows when selected or hovered) */}
          <circle
            cx="300"
            cy="394"
            r="86"
            stroke={chairClicked ? '#fbbf24' : '#00f5d4'}
            strokeWidth="3"
            strokeDasharray="8 6"
            fill="none"
            opacity={hoveredChair || chairClicked ? 0.7 : 0}
            style={{
              transition: 'opacity 0.3s ease, stroke 0.3s ease',
              animation: 'spin 12s linear infinite'
            }}
          />
        </g>

        {/* ── Candidate (Right Character) ── */}
        <g
          className="interactive-group candidate-group"
          onMouseEnter={() => setHoveredCandidate(true)}
          onMouseLeave={() => setHoveredCandidate(false)}
        >
          {/* Candidate Shadow */}
          <ellipse cx="460" cy="532" rx="40" ry="10" fill="rgba(0, 0, 0, 0.2)" />

          {/* Legs */}
          {/* Left Leg */}
          <path d="M442 400 L432 518" stroke="#1d4ed8" strokeWidth="15" strokeLinecap="round" />
          {/* Right Leg */}
          <path d="M470 400 L476 518" stroke="#1d4ed8" strokeWidth="15" strokeLinecap="round" />

          {/* Rips in jeans details */}
          <line x1="434" y1="450" x2="446" y2="450" stroke="#ffffff" strokeWidth="2" />
          <line x1="468" y1="468" x2="478" y2="468" stroke="#ffffff" strokeWidth="2" />

          {/* Shoes - Green sneakers */}
          {/* Left shoe */}
          <path d="M432 516 L416 518 L410 527 L410 535 L436 535 L436 516 Z" fill="#0d9488" />
          <path d="M408 531 H438 V535 H408 Z" fill="#ffffff" />
          <circle cx="412" cy="529" r="4" fill="#ffffff" />

          {/* Right shoe */}
          <path d="M476 516 L476 535 L500 535 L500 527 L494 518 L480 516 Z" fill="#0d9488" />
          <path d="M474 531 H502 V535 H474 Z" fill="#ffffff" />
          <circle cx="498" cy="529" r="4" fill="#ffffff" />

          {/* Pants Torso Joint */}
          <path d="M432 390 L480 390 L484 415 L428 415 Z" fill="#1d4ed8" />

          {/* Torso & White Top */}
          <path d="M436 290 L476 290 L486 395 L426 395 Z" fill="#ffffff" />
          <path d="M436 290 L476 290 L486 395 L426 395 Z" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          <path d="M448 290 Q456 298 464 290" fill="none" stroke="#cbd5e1" strokeWidth="2" />

          {/* Right arm & sleeve (casual gesture) */}
          <g className="candidate-arm">
            <path d="M438 290 L426 292 L412 320 L422 324 Z" fill="#ffffff" />
            <path d="M418 322 L400 338 L386 332 L402 316 Z" fill="#ffd1ac" />
            {/* Gesture Hand */}
            <path d="M386 332 C380 332, 376 336, 372 334 C369 331, 372 326, 378 324 C381 323, 385 324, 386 326 Z" fill="#ffd1ac" />
          </g>

          {/* Left sleeve & arm holding folder */}
          <path d="M474 290 L486 292 L498 330 L488 334 Z" fill="#ffffff" />
          {/* Folder Portfolio (brown) */}
          <path d="M476 328 L516 318 L532 370 L492 380 Z" fill="#78350f" rx="3" />
          <path d="M480 332 L514 324 L528 366 L494 374 Z" fill="#fafafa" />
          <line x1="486" y1="344" x2="510" y2="338" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="488" y1="354" x2="512" y2="348" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="490" y1="364" x2="514" y2="358" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Hand clasping folder */}
          <path d="M486 364 C490 364, 494 367, 494 371 C494 375, 488 375, 482 371 Z" fill="#ffd1ac" />

          {/* Head & Neck */}
          <rect x="450" y="268" width="12" height="22" fill="#ffd1ac" />

          <g className="candidate-head">
            {/* Hair back */}
            <path d="M430 230 C420 240, 420 290, 435 302 C440 270, 472 270, 477 302 C492 290, 492 240, 482 230 Z" fill="#eab308" />

            {/* Face */}
            <circle cx="456" cy="242" r="26" fill="#ffd1ac" />

            {/* Hair front bangs */}
            <path d="M431 230 C441 212, 471 212, 481 230 C468 224, 444 224, 431 230 Z" fill="#facc15" />
            <path d="M472 230 C480 238, 484 252, 482 265 C478 258, 478 252, 472 250 Z" fill="#facc15" />
            <path d="M440 230 C432 238, 428 252, 430 265 C434 258, 434 252, 440 250 Z" fill="#facc15" />

            {/* Eyes tracking */}
            {/* Left eye */}
            <ellipse cx="447" cy="240" rx="5" ry="3.5" fill="#ffffff" />
            <circle cx={447 + pupilOffset.x} cy={240 + pupilOffset.y} r="2" fill="#0f172a" />

            {/* Right eye */}
            <ellipse cx="463" cy="240" rx="5" ry="3.5" fill="#ffffff" />
            <circle cx={463 + pupilOffset.x} cy={240 + pupilOffset.y} r="2" fill="#0f172a" />

            {/* Glasses (Round Gold) */}
            <circle cx="447" cy="240" r="10" stroke="#b45309" strokeWidth="1.8" fill="none" />
            <circle cx="463" cy="240" r="10" stroke="#b45309" strokeWidth="1.8" fill="none" />
            <line x1="453" y1="240" x2="457" y2="240" stroke="#b45309" strokeWidth="1.8" />
            <path d="M437 240 L431 238" stroke="#b45309" strokeWidth="1.8" />
            <path d="M473 240 L479 238" stroke="#b45309" strokeWidth="1.8" />

            {/* Nose */}
            <path d="M455 242 L457 246 L454 247" stroke="#e2b493" strokeWidth="1.5" fill="none" />

            {/* Smile */}
            <path d="M450 254 Q456 260 462 254" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Blush */}
            <circle cx="438" cy="249" r="3" fill="#ff8a8a" opacity="0.4" />
            <circle cx="474" cy="249" r="3" fill="#ff8a8a" opacity="0.4" />
          </g>

          {/* Interactive Thought Bubble */}
          <g
            className="tooltip-box"
            style={{
              opacity: hoveredCandidate ? 1 : 0,
              transform: hoveredCandidate ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            <path
              d="M 390 115 A 12 12 0 0 1 402 103 L 528 103 A 12 12 0 0 1 540 115 L 540 165 A 12 12 0 0 1 528 177 L 472 177 L 464 193 L 456 177 L 402 177 A 12 12 0 0 1 390 165 Z"
              fill="#111827"
              stroke="#00bbf9"
              strokeWidth="2"
            />
            <text x="465" y="132" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600" fontFamily="Outfit">
              Is this my new
            </text>
            <text x="465" y="152" textAnchor="middle" fill="#00bbf9" fontSize="14" fontWeight="800" fontFamily="Outfit">
              dream job? ✨
            </text>
          </g>

          {/* Floating Technology Particles (appear on Candidate hover) */}
          <g opacity={hoveredCandidate ? 1 : 0} style={{ transition: 'opacity 0.3s' }}>
            {/* Civil particle */}
            <g className="tech-particle particle-delay-1" style={{ '--float-x': '-25px' }}>
              <rect x="360" y="320" width="45" height="18" rx="9" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
              <text x="382.5" y="332" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0284c7" fontFamily="Outfit">Civil</text>
            </g>
            {/* Mechanical particle */}
            <g className="tech-particle particle-delay-2" style={{ '--float-x': '30px' }}>
              <rect x="500" y="310" width="75" height="18" rx="9" fill="#0f172a" stroke="#fbbf24" strokeWidth="1" />
              <text x="537.5" y="322" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fbbf24" fontFamily="Outfit">Mechanical</text>
            </g>
            {/* Design particle */}
            <g className="tech-particle particle-delay-3" style={{ '--float-x': '-10px' }}>
              <rect x="385" y="290" width="52" height="18" rx="9" fill="#0f172a" stroke="#0d9488" strokeWidth="1" />
              <text x="411" y="302" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0d9488" fontFamily="Outfit">Design</text>
            </g>
            {/* Sales particle */}
            <g className="tech-particle particle-delay-4" style={{ '--float-x': '15px' }}>
              <rect x="500" y="280" width="45" height="18" rx="9" fill="#0f172a" stroke="#db2777" strokeWidth="1" />
              <text x="522.5" y="292" textAnchor="middle" fontSize="9" fontWeight="700" fill="#db2777" fontFamily="Outfit">Sales</text>
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}

export default Illustration
