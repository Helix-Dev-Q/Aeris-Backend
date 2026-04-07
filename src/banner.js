import dotenv from 'dotenv';
dotenv.config();

const C = {
  RESET:  '\x1b[0m',
  BOLD:   '\x1b[1m',
  PINK:   '\x1b[38;2;255;105;180m',
  PURPLE: '\x1b[38;2;180;100;255m',
  BLUE:   '\x1b[38;2;80;160;255m',
  G2:     '\x1b[38;2;100;100;100m',
};
const L = C.PINK + C.BOLD;
const P = C.PURPLE + C.BOLD;
const B = C.BLUE + C.BOLD;
const Z = C.RESET;
const PORT = process.env.PORT || 3551;

console.log('');
console.log(`  ${L}    ___   ______ ____   __________    ____  ___   ________ __ __ ______ _   ______  ${Z}`);
console.log(`  ${L}   /   | / ____// __ \\ /  _/ ___/   / __ )/   | / ____// //_// ____// | / / __ \\ ${Z}`);
console.log(`  ${P}  / /| |/ __/  / /_/ / / / \\__ \\   / __  / /| |/ /    / ,<  / __/  /  |/ / / / / ${Z}`);
console.log(`  ${P} / ___ / /___ / _, _/_/ / ___/ /  / /_/ / ___ / /___ / /| |/ /___ / /|  / /_/ /  ${Z}`);
console.log(`  ${B}/_/  |_\\____//_/ |_|/___//____/  /_____/_/  |_\\____//_/ |_/_____//_/ |_/_____/   ${Z}`);
console.log('');
console.log(`  ${C.G2}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${Z}`);
console.log(`  ${C.PINK}${C.BOLD}  AERIS BACKEND    Welcome to Aeris Backend - ${PORT}${Z}`);
console.log(`  ${C.G2}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${Z}`);
console.log('');
