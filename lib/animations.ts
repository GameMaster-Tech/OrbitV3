import type { Variants } from 'framer-motion'

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export const cardEntrance: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:   { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

export const expandDown: Variants = {
  hidden: { opacity: 0, height: 0 },
  show:   { opacity: 1, height: 'auto', transition: { duration: 0.3 } },
  exit:   { opacity: 0, height: 0, transition: { duration: 0.2 } },
}
