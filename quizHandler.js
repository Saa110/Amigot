// Streamlined quiz handler with rigid, logged flow
// Sequence:
// 1) Click entry buttons (Attempt quiz, Continue; skip Re-attempt)
//    - If neither entry action is available on the page, signal caller to move to next link
// 2) Fill radio options for all questions
// 3) Click "Finish attempt ..."
// 4) Click "Submit all and finish"
// 5) Notify caller to proceed to the next link

(function initQuizHandler() {
  class QuizHandler {
    constructor(options = {}) {
      this.loggerPrefix = options.loggerPrefix || '[QuizHandler]';
      this.advanceCallback = typeof options.onAdvance === 'function' ? options.onAdvance : null;
      this.isEnabled = options.isEnabled !== false; // default true
      this.stepDelayMs = typeof options.stepDelayMs === 'number' ? options.stepDelayMs : 800;
      this.finishDelayMs = typeof options.finishDelayMs === 'number' ? options.finishDelayMs : 1200;
    }

    log(...args) {
      try { console.log(this.loggerPrefix, ...args); } catch (_) {}
    }

    setDelay(callback, delayMs) {
      return window.setTimeout(callback, delayMs);
    }

    run() {
      if (!this.isEnabled) return;
      this.log('Starting streamlined quiz flow');
      // If we're on the summary page, immediately try to submit all and finish
      if (window.location && typeof window.location.href === 'string' && window.location.href.includes('/mod/quiz/summary.php')) {
        this.log('Detected summary page; proceeding to Submit all and finish');
        this.stepClickSubmitAllAndFinish();
        return;
      }
      // If we've landed on the review page after submission, advance to next item
      if (window.location && typeof window.location.href === 'string' && window.location.href.includes('/mod/quiz/review.php')) {
        this.log('Detected review page; notifying caller to advance');
        this.notifyAdvance('review');
        return;
      }
      this.stepClickEntryButtons();
    }

    stepClickEntryButtons() {
      const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], a[role="button"], a.btn, button.btn'));
      const textOf = (el) => (el.textContent || el.value || '').toLowerCase();
      const isReAttempt = (el) => textOf(el).includes('re-attempt quiz');
      const isAttemptQuiz = (el) => textOf(el).includes('attempt quiz') && !isReAttempt(el);
      const isContinue = (el) => textOf(el).includes('continue');

      const attemptBtn = candidates.find(isAttemptQuiz);
      const continueBtn = candidates.find(isContinue);
      const reattemptBtn = candidates.find(isReAttempt);

      this.log('Entry buttons:', {
        attempt: attemptBtn ? (attemptBtn.textContent || attemptBtn.value || '').trim() : null,
        continue: continueBtn ? (continueBtn.textContent || continueBtn.value || '').trim() : null,
        reattempt: !!reattemptBtn
      });

      if (attemptBtn) {
        this.log('Clicking Attempt quiz');
        attemptBtn.click();
        return;
      }
      if (continueBtn) {
        this.log('Clicking Continue');
        continueBtn.click();
        return;
      }

      // If only re-attempt is available, skip this quiz and advance
      if (reattemptBtn && !attemptBtn && !continueBtn) {
        this.log('Only Re-attempt available; asking caller to advance');
        if (this.advanceCallback) this.advanceCallback({ reason: 're-attempt-only' });
        return;
      }

      // No entry action available → proceed to fill radios if on question page
      this.log('No entry action available; proceeding to fill radios');
      this.stepFillRadios();
    }

    stepFillRadios() {
      // Fill one radio per question group (by name), exclude "clear my choice" (-1)
      const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'))
        .filter(r => r.value !== '-1' && !r.disabled && r.offsetParent !== null);
      const nameToRadios = new Map();
      allRadios.forEach(r => {
        const name = r.name || '__noname__';
        if (!nameToRadios.has(name)) nameToRadios.set(name, []);
        nameToRadios.get(name).push(r);
      });

      const groups = Array.from(nameToRadios.values());
      let filled = 0;
      groups.forEach((group, idx) => {
        this.setDelay(() => {
          if (group.length > 0) {
            const pick = group[Math.floor(Math.random() * group.length)];
            try {
              pick.checked = true;
              pick.dispatchEvent(new Event('change', { bubbles: true }));
              filled += 1;
            } catch (_) {}
          }
        }, idx * this.stepDelayMs);
      });
      this.setDelay(() => {
        this.log(`Filled ${filled} radio groups`);
        this.stepClickFinishAttempt();
      }, Math.max(1, groups.length) * this.stepDelayMs + 200);
    }

    stepClickFinishAttempt() {
      const finishAttemptButton = document.querySelector('#mod_quiz-next-nav, .mod_quiz-next-nav, input[type="submit"][name="next"][value*="Finish attempt"], input[type="submit"][value*="Finish attempt"]');
      if (finishAttemptButton) {
        this.log('Clicking Finish attempt');
        finishAttemptButton.click();
        this.setDelay(() => this.stepClickSubmitAllAndFinish(), this.finishDelayMs);
        return;
      }
      this.log('Finish attempt button not found');
      this.stepClickSubmitAllAndFinish();
    }

    stepClickSubmitAllAndFinish() {
        console.log('finding submit all and finish button');
      const tryFind = () => {
        // First, look inside modal/dialog confirmations
        const modalButtons = Array.from(document.querySelectorAll('.modal-dialog button, .moodle-dialogue-base button, .modal-footer button'));
        const modalPrimarySave = modalButtons.find(el => {
          const label = (el.textContent || el.value || '').toLowerCase().trim();
          return el.classList && el.classList.contains('btn-primary') &&
                 (el.getAttribute('data-action') === 'save' || label.includes('submit all and finish'));
        });
        if (modalPrimarySave) return modalPrimarySave;

        // Otherwise, scan page buttons with strict preference rules
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
        const labelOf = (el) => (el.textContent || el.value || '').toLowerCase().trim();
        const isPrimary = (el) => el.classList && el.classList.contains('btn-primary');
        const isSecondary = (el) => el.classList && el.classList.contains('btn-secondary');

        // Prefer explicit primary submit-all
        const explicitPrimary = buttons.find(el => /^single_button/.test(el.id || '') && isPrimary(el) && labelOf(el).includes('submit all and finish'));
        if (explicitPrimary) return explicitPrimary;

        // Any primary with submit-all label
        const primaryByLabel = buttons.find(el => isPrimary(el) && labelOf(el).includes('submit all and finish'));
        if (primaryByLabel) return primaryByLabel;

        // Label contains submit-all, avoid secondary like Return to attempt
        const byLabel = buttons.find(el => labelOf(el).includes('submit all and finish') && !isSecondary(el));
        if (byLabel) return byLabel;

        // Last resort: any primary single_button
        const anyPrimarySingle = buttons.find(el => /^single_button/.test(el.id || '') && isPrimary(el));
        if (anyPrimarySingle) return anyPrimarySingle;

        return null;
      };

      let attempts = 0;
      const maxAttempts = Math.ceil(8000 / 400); // ~8s
      const interval = setInterval(() => {
        attempts += 1;
        const target = tryFind();
        if (target) {
          clearInterval(interval);
          this.log('Clicking Submit all and finish');
          console.log('clicking the button',target);
          target.click();
          // Immediately try to confirm in modal if it appears
          const tryConfirmModal = () => {
            const modalButtons = Array.from(document.querySelectorAll('.modal-dialog button, .moodle-dialogue-base button, .modal-footer button'));
            const confirm = modalButtons.find(el => {
              const label = (el.textContent || el.value || '').toLowerCase().trim();
              return (el.getAttribute('data-action') === 'save' || label.includes('submit all and finish')) &&
                     el.classList && el.classList.contains('btn-primary');
            });
            if (confirm) {
              this.log('Confirming in modal: Submit all and finish');
              confirm.click();
              return true;
            }
            return false;
          };
          let confirmAttempts = 0;
          const confirmInterval = setInterval(() => {
            confirmAttempts += 1;
            if (tryConfirmModal() || confirmAttempts >= Math.ceil(4000/200)) {
              clearInterval(confirmInterval);
            }
          }, 200);
          //this.setDelay(() => this.notifyAdvance('submitted'), this.finishDelayMs);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          this.log('Submit all and finish button not found after waiting');
          this.notifyAdvance('no-submit-button');
        } else if (attempts === 1) {
          this.log('Waiting for Submit all and finish button...');
        }
      }, 400);
    }

    notifyAdvance(reason) {
      this.log('Flow completed; notifying caller to advance', { reason });
      if (this.advanceCallback) this.advanceCallback({ reason });
    }
  }

  // Expose on window for easy integration
  window.QuizHandler = QuizHandler;
})();


