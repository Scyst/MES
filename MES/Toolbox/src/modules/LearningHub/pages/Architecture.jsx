import { useEffect } from 'react';
import { legacyArchHtml } from '../data/legacyArchHtml';

export default function Architecture() {
  useEffect(() => {
    // ===== SCROLL ANIMATIONS =====
    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { 
          e.target.classList.add('in-view'); 
          scrollObserver.unobserve(e.target); 
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.observe-me').forEach((el) => { 
      scrollObserver.observe(el); 
    });

    // ===== FOLDER TREE ANIMATION =====
    const treeObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const items = e.target.querySelectorAll('.tree-item');
          items.forEach((item) => {
            setTimeout(() => { 
              item.classList.add('visible'); 
            }, parseInt(item.getAttribute('data-delay') || '0'));
          });
          treeObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    const treeEl = document.getElementById('folderTree');
    if (treeEl) treeObserver.observe(treeEl);

    // ===== VITE FLOW ANIMATION =====
    const flowObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const boxes = e.target.querySelectorAll('.flow-box, .flow-arrow');
          boxes.forEach((box, index) => {
            setTimeout(() => { 
              box.classList.add('visible'); 
            }, index * 200);
          });
          flowObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    const flowEl = document.getElementById('viteFlow');
    if (flowEl) flowObserver.observe(flowEl);

    // ===== WORKFLOW TIMELINE ANIMATION =====
    const wfObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const steps = e.target.querySelectorAll('.wf-step');
          steps.forEach((step, index) => {
            setTimeout(() => {
              step.classList.add('visible');
            }, index * 250);
          });
          wfObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    const tlEl = document.querySelector('.workflow-timeline');
    if (tlEl) wfObserver.observe(tlEl);

    return () => {
      scrollObserver.disconnect();
      treeObserver.disconnect();
      flowObserver.disconnect();
      wfObserver.disconnect();
    };
  }, []);

  return (
    <div className="tab-panel active" dangerouslySetInnerHTML={{ __html: legacyArchHtml }} />
  );
}
