/**
 * Parallax Effects Module
 * Handles the animated background shapes that respond to scrolling
 */

const parallaxShapes = [];
const numShapes = 8;

export const initParallax = () => {
  const shapeEls = document.querySelectorAll('.parallax-shape');
  
  for (let i = 0; i < numShapes; i++) {
    const el = shapeEls[i];
    if (!el) continue;

    const shapeClass = el.className.replace('parallax-shape ', '').trim();
    const size = 100 + (i % 3) * 60;
    const topPos = 10 + (i * 10);
    const initialLeft = (i * 15) % 80;

    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.top = topPos + '%';
    el.style.left = initialLeft + '%';

    const colors = ['#7aa2f7', '#bb9af7', '#9ece6a', '#f7768e', '#e0af68', '#7aa2f7', '#bb9af7', '#9ece6a'];
    el.style.backgroundColor = colors[i] || '#7aa2f7';
    el.style.opacity = '0.15';

    parallaxShapes.push({
      el: el,
      left: initialLeft,
      top: topPos,
      speed: 0.05 + (i * 0.02),
      offset: i * 0.5,
      direction: i % 2 === 0 ? 1 : -1
    });
  }
};

let lastScrollY = 0;

export const updateParallax = () => {
  const scrollY = window.scrollY;
  const scrollChange = scrollY - lastScrollY;
  lastScrollY = scrollY;

  parallaxShapes.forEach((shape, idx) => {
    shape.left += shape.speed * shape.direction * (scrollChange * 0.5);

    const sineOffset = Math.sin((scrollY * 0.002) + shape.offset) * 30;

    if (shape.left > 100) shape.left = -20;
    if (shape.left < -20) shape.left = 100;

    const newLeft = ((shape.left + sineOffset) % 100 + 100) % 100;

    shape.el.style.left = newLeft + '%';
    shape.el.style.transform = 'translateY(' + (scrollY * 0.2 * (idx + 1) * 0.1) + 'px)';
  });

  requestAnimationFrame(updateParallax);
};

// Module initialization
export const initParallaxModule = () => {
  initParallax();
  updateParallax();
};
