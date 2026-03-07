/**
 * Renderer Module
 * Dynamically builds the resume DOM from resumeData.
 */

import { resumeData } from './resume-data.js';

/**
 * Creates a DOM element with optional classes and attributes
 */
const createElement = (tag, className = "", text = "", attrs = {}) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.innerText = text;
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
};

/**
 * Renders the entire resume into the container
 */
export const renderResume = (containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = ""; // Clear existing

  resumeData.forEach(item => {
    switch (item.type) {
      case 'h1':
        container.appendChild(createElement('h1', '', item.text, { 'data-id': item.id }));
        break;
      case 'h2':
        container.appendChild(createElement('h2', '', item.text, { 'data-id': item.id }));
        break;
      case 'experience':
        const expDiv = createElement('div', 'experience-item', '', { 'data-id': item.id });
        
        const h3 = createElement('h3', '', `${item.company} - ${item.role}`, { 
          'data-id': `${item.id}-title`,
          'data-role': item.role,
          'data-company': item.company
        });
        // If location exists, add it (like Snap and Vertebrae)
        if (item.location) {
           // We might want to preserve the Snap Inc span style if needed, 
           // but for simplicity we can just use the text.
           // However, Snap Inc has a span in the original HTML.
           if (item.company === "Snap Inc.") {
             h3.innerHTML = `<span style="font-size: 28px">Snap Inc.</span>, ${item.location} - ${item.role}`;
           } else if (item.location) {
             h3.innerText = `${item.company}, ${item.location} - ${item.role}`;
           }
        }
        
        const dateP = createElement('p', 'date', item.date, { 'data-id': `${item.id}-date` });
        const ul = createElement('ul');
        
        item.bullets.forEach((bullet, idx) => {
          ul.appendChild(createElement('li', '', bullet.text, { 'data-id': `${item.id}-bullet-${idx}` }));
        });

        expDiv.appendChild(h3);
        expDiv.appendChild(dateP);
        expDiv.appendChild(ul);
        container.appendChild(expDiv);
        break;
      case 'ul':
        const listUl = createElement('ul', '', '', { 'data-id': item.id });
        item.items.forEach(li => {
          listUl.appendChild(createElement('li', '', li.text, { 'data-id': li.id }));
        });
        container.appendChild(listUl);
        break;
    }
  });
};
