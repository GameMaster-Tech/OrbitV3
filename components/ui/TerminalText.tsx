'use client'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface TerminalLine {
  text: string
  delay?: number
  color?: 'primary' | 'accent' | 'warning' | 'muted' | 'text'
  prefix?: string
}

interface TerminalTextProps {
  lines: TerminalLine[]
  typingSpeed?: number
  onComplete?: () => void
  className?: string
  showCursor?: boolean
  autoStart?: boolean
}

const colorMap: Record<string, string> = {
  primary: 'text-orbit-primary',
  accent:  'text-orbit-accent',
  warning: 'text-orbit-warning',
  muted:   'text-orbit-muted',
  text:    'text-orbit-text',
}

export function TerminalText({
  lines,
  typingSpeed = 18,
  onComplete,
  className,
  showCursor = true,
  autoStart = true,
}: TerminalTextProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([])
  const [currentLineIdx, setCurrentLineIdx] = useState(-1)
  const [currentText, setCurrentText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (!autoStart) return
    const firstDelay = lines[0]?.delay ?? 0
    timerRef.current = setTimeout(() => setCurrentLineIdx(0), firstDelay)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [autoStart, lines])

  useEffect(() => {
    if (currentLineIdx < 0 || currentLineIdx >= lines.length) return

    const line = lines[currentLineIdx]
    const fullText = line.text
    let charIdx = 0
    setCurrentText('')
    setIsTyping(true)

    const typeNext = () => {
      if (charIdx <= fullText.length) {
        setCurrentText(fullText.slice(0, charIdx))
        charIdx++
        timerRef.current = setTimeout(typeNext, typingSpeed)
      } else {
        setIsTyping(false)
        setVisibleLines(prev => [...prev, fullText])
        setCurrentText('')

        const nextIdx = currentLineIdx + 1
        if (nextIdx < lines.length) {
          const nextDelay = lines[nextIdx].delay ?? 80
          timerRef.current = setTimeout(() => setCurrentLineIdx(nextIdx), nextDelay)
        } else {
          setDone(true)
          onComplete?.()
        }
      }
    }

    timerRef.current = setTimeout(typeNext, typingSpeed)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [currentLineIdx, typingSpeed, lines, onComplete])

  return (
    <div className={cn('font-mono text-sm leading-relaxed', className)}>
      {visibleLines.map((text, i) => {
        const lineConfig = lines[i]
        const color = colorMap[lineConfig?.color ?? 'primary']
        const prefix = lineConfig?.prefix ?? '> '
        return (
          <div key={i} className="flex items-start gap-2 mb-1">
            <span className="text-orbit-muted text-xs shrink-0 mt-0.5">{prefix}</span>
            <span className={cn(color, 'text-shadow-glow')}>{text}</span>
          </div>
        )
      })}

      {currentLineIdx >= 0 && currentLineIdx < lines.length && isTyping && (
        <div className="flex items-start gap-2 mb-1">
          <span className="text-orbit-muted text-xs shrink-0 mt-0.5">
            {lines[currentLineIdx]?.prefix ?? '> '}
          </span>
          <span className={cn(colorMap[lines[currentLineIdx]?.color ?? 'primary'])}>
            {currentText}
            {showCursor && (
              <span className="inline-block w-2 h-4 bg-current ml-0.5 animate-terminal-blink align-text-bottom" />
            )}
          </span>
        </div>
      )}

      {done && showCursor && (
        <div className="flex items-start gap-2">
          <span className="text-orbit-muted text-xs shrink-0 mt-0.5">{'>'}</span>
          <span className="inline-block w-2 h-4 bg-orbit-primary ml-0.5 animate-terminal-blink align-text-bottom" />
        </div>
      )}
    </div>
  )
}
