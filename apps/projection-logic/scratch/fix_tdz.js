const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const isCRLF = content.includes('\r\n');
const eol = isCRLF ? '\r\n' : '\n';

// 1. In syncMaskPropertiesToUI, move declarations to the top
const target1 = [
    '                const badge = document.getElementById("mask-selected-name-badge");',
    '                const hint = document.getElementById("mask-selected-hint");',
    '                if (badge) badge.textContent = mask ? (mask.name || "Selected Mask") : "None";'
].join(eol);

const replace1 = [
    '                const badge = document.getElementById("mask-selected-name-badge");',
    '                const hint = document.getElementById("mask-selected-hint");',
    '                const propDiam = document.getElementById("mask-prop-diameter");',
    '                const propR = document.getElementById("mask-prop-rad");',
    '                const cLock = document.getElementById("mask-prop-circle-lock");',
    '                if (badge) badge.textContent = mask ? (mask.name || "Selected Mask") : "None";'
].join(eol);

if (!content.includes(target1)) {
    console.error('Target 1 not found!');
    process.exit(1);
}
content = content.replace(target1, replace1);

// Remove the later declaration in syncMaskPropertiesToUI
const target2 = [
    '                const propDiam = document.getElementById("mask-prop-diameter");',
    '                const propR = document.getElementById("mask-prop-rad");',
    '                const cLock = document.getElementById("mask-prop-circle-lock");',
    '                const isCircOrEll = mask && (mask.type === "circle" || mask.type === "ellipse");'
].join(eol);

const replace2 = [
    '                const isCircOrEll = mask && (mask.type === "circle" || mask.type === "ellipse");'
].join(eol);

if (!content.includes(target2)) {
    console.error('Target 2 not found!');
    process.exit(1);
}
content = content.replace(target2, replace2);

// 2. In syncSelectedMaskProperties, move declarations to the top
const target3 = [
    '            const badge = document.getElementById("mask-selected-name-badge");',
    '            const hint = document.getElementById("mask-selected-hint");',
    '            if (badge) badge.textContent = mask ? (mask.name || "Selected Mask") : "None";'
].join(eol);

const replace3 = [
    '            const badge = document.getElementById("mask-selected-name-badge");',
    '            const hint = document.getElementById("mask-selected-hint");',
    '            const propDiameter = document.getElementById("mask-prop-diameter");',
    '            const propRad = document.getElementById("mask-prop-rad");',
    '            const circleLock = document.getElementById("mask-prop-circle-lock");',
    '            if (badge) badge.textContent = mask ? (mask.name || "Selected Mask") : "None";'
].join(eol);

if (!content.includes(target3)) {
    console.error('Target 3 not found!');
    process.exit(1);
}
content = content.replace(target3, replace3);

// Remove the later declaration in syncSelectedMaskProperties
const target4 = [
    '            const propDiameter = document.getElementById("mask-prop-diameter");',
    '            const propRad = document.getElementById("mask-prop-rad");',
    '            const circleLock = document.getElementById("mask-prop-circle-lock");',
    '            const isCircleOrEllipse = mask && (mask.type === "circle" || mask.type === "ellipse");'
].join(eol);

const replace4 = [
    '            const isCircleOrEllipse = mask && (mask.type === "circle" || mask.type === "ellipse");'
].join(eol);

if (!content.includes(target4)) {
    console.error('Target 4 not found!');
    process.exit(1);
}
content = content.replace(target4, replace4);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated index.html with top-level element declarations!');
