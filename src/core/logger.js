// Aeris Logger — console output system

const C = {
  RESET:  '\x1b[0m',
  BOLD:   '\x1b[1m',
  DIM:    '\x1b[2m',

  // greys
  G1: '\x1b[38;2;50;50;50m',
  G2: '\x1b[38;2;100;100;100m',
  G3: '\x1b[38;2;160;160;160m',

  // brand
  PINK:   '\x1b[38;2;255;105;180m',
  PURPLE: '\x1b[38;2;180;100;255m',

  // status
  BLUE:   '\x1b[38;2;80;160;255m',
  CYAN:   '\x1b[38;2;60;210;210m',
  GREEN:  '\x1b[38;2;80;220;120m',
  YELLOW: '\x1b[38;2;255;210;60m',
  RED:    '\x1b[38;2;240;70;70m',
  ORANGE: '\x1b[38;2;255;150;50m',

  WHITE:  '\x1b[38;2;230;230;230m',
};

function time() {
  const n = new Date();
  const h = String(n.getHours()).padStart(2, '0');
  const m = String(n.getMinutes()).padStart(2, '0');
  const s = String(n.getSeconds()).padStart(2, '0');
  return `${C.G1}${h}${C.G2}:${C.G1}${m}${C.G2}:${C.G1}${s}${C.RESET}`;
}

function badge(label, color) {
  const pad = 9;
  const padded = label.padEnd(pad);
  return `${C.G2}│${C.RESET} ${color}${C.BOLD}${padded}${C.RESET} ${C.G2}»${C.RESET}`;
}

function line(label, color, msg, msgColor = C.WHITE) {
  console.log(`  ${time()}  ${badge(label, color)}  ${msgColor}${msg}${C.RESET}`);
}

export function printBanner() {
  const L = C.PINK + C.BOLD;
  const P = C.PURPLE + C.BOLD;
  const B = C.BLUE + C.BOLD;
  const R = C.CYAN + C.BOLD;
  const Z = C.RESET;

  console.log('');
  console.log(`  ${L}███████╗ ██████╗ ██████╗ ████████╗███╗   ███╗██████╗ ${Z}   ${R}  ___          _   __  __ ___  ${Z}`);
  console.log(`  ${L}██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝████╗ ████║██╔══██╗${Z}   ${R} | __| ___  _ | |_|  \\/  | _ \\ ${Z}`);
  console.log(`  ${P}█████╗  ██║   ██║██████╔╝   ██║   ██╔████╔██║██████╔╝${Z}   ${P} | _| / _ \\| '_|  _| |\\/| |  _/ ${Z}`);
  console.log(`  ${P}██╔══╝  ██║   ██║██╔══██╗   ██║   ██║╚██╔╝██║██╔═══╝ ${Z}   ${P} |_|  \\___/|_|  \\__|_|  |_|_|   ${Z}`);
  console.log(`  ${B}██║     ╚██████╔╝██║  ██║   ██║   ██║ ╚═╝ ██║██║     ${Z}   ${B}                                 ${Z}`);
  console.log(`  ${B}╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚═╝     ${Z}   ${B}   Aeris Backend                ${Z}`);
  console.log('');
}

class Logger {
  discordauth(msg) { line('AUTH',     C.PURPLE, msg); }
  database(msg)    { line('DATABASE', C.CYAN,   msg); }
  backend(msg)     { line('BACKEND',  C.BLUE,   msg); }
  presence(msg)    { line('PRESENCE', C.CYAN,   msg); }
  bot(msg)         { line('BOT',      C.PURPLE, msg); }
  party(msg)       { line('PARTY',    C.BLUE,   msg); }
  arena(msg)       { line('ARENA',    C.YELLOW, msg); }
  xmpp(msg)        { line('XMPP',     C.CYAN,   msg); }
  error(msg)       { line('ERROR',    C.RED,    msg, C.RED); }
  request(msg)     { line('REQUEST',  C.G2,     msg, C.G3); }
  panel(msg)       { line('PANEL',    C.BLUE,   msg); }
  launcher(msg)    { line('LAUNCHER', C.BLUE,   msg); }
  debug(msg)       { line('DEBUG',    C.YELLOW, msg, C.YELLOW); }
  warn(msg)        { line('WARN',     C.ORANGE, msg, C.ORANGE); }
  info(msg)        { line('INFO',     C.BLUE,   msg); }
  vbucks(msg)      { line('VBUCKS',   C.GREEN,  msg, C.GREEN); }
  hype(msg)        { line('HYPE',     C.PINK,   msg); }
  xp(msg)          { line('XP',       C.GREEN,  msg, C.GREEN); }
  kill(msg)        { line('KILL',     C.RED,    msg, C.RED); }
  died(msg)        { line('DIED',     C.RED,    msg, C.RED); }
  win(msg)         { line('WIN',      C.GREEN,  msg, C.GREEN); }
  api(msg)         { line('API',      C.CYAN,   msg); }
  umbrella(msg)    { line('UMBRELLA', C.CYAN,   msg); }
  crown(msg)       { line('CROWN',    C.YELLOW, msg, C.YELLOW); }
  mm(msg)          { line('MATCHMKR', C.BLUE,   msg); }
  http(msg)        { line('HTTP',     C.CYAN,   msg); }
  queue(msg)       { line('QUEUE',    C.GREEN,  msg, C.GREEN); }
  unqueue(msg)     { line('UNQUEUE',  C.YELLOW, msg, C.YELLOW); }
  joinable(msg)    { line('JOINABLE', C.GREEN,  msg, C.GREEN); }
  notjoinable(msg) { line('NOJOIN',   C.RED,    msg, C.RED); }
  security(msg)    { line('SECURITY', C.RED,    msg, C.RED); }

  backendstart(msg) {
    console.log('');
    console.log(`  ${C.G2}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.RESET}`);
    line('Aeris', C.PINK, msg, C.PINK);
    console.log(`  ${C.G2}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.RESET}`);
    console.log('');
  }
}

export default new Logger();
