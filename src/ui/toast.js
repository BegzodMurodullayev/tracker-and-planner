export function showToast(element, message) {
  if (!element || !message) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(element._timerId);
  element._timerId = setTimeout(() => {
    element.classList.remove("show");
  }, 2400);
}
