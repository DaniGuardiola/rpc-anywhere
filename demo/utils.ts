export function el<Element extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element with id ${id} not found`);
  return element as Element;
}
