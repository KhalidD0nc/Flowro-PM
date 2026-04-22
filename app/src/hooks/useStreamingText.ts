/**
 * useStreamingText Hook
 * 
 * Provides a smooth, word-by-word text streaming effect for AI responses.
 * Eliminates the "stutter" caused by chunked LLM outputs by buffering
 * content and revealing it at a consistent rhythm.
 * 
 * @see /Docs/Brand-Guidelines.md - Animation & Motion principles
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseStreamingTextOptions {
  /** Base speed in milliseconds per character (default: 12ms for ~80 chars/sec) */
  charDelay?: number
  /** Minimum delay between reveals to prevent jarring speed-ups (default: 8ms) */
  minDelay?: number
  /** Maximum delay between reveals (default: 30ms) */
  maxDelay?: number
  /** Additional pause after punctuation (default: 60ms) */
  punctuationPause?: number
  /** Whether streaming is currently active */
  isStreaming: boolean
}

export interface UseStreamingTextResult {
  /** The visible portion of text that has been "typed" */
  displayedText: string
  /** Whether we're still catching up to the raw content */
  isTyping: boolean
  /** Reset the streaming state */
  reset: () => void
}

/**
 * Creates a smooth typing effect for streamed AI content.
 * 
 * Instead of showing content as chunky LLM outputs arrive,
 * this hook reveals text word-by-word at a natural reading pace.
 * 
 * @param rawContent - The full accumulated content from the stream
 * @param options - Configuration for typing speed and behavior
 */
export function useStreamingText(
  rawContent: string,
  options: UseStreamingTextOptions
): UseStreamingTextResult {
  const {
    charDelay = 12,
    minDelay = 8,
    maxDelay = 30,
    punctuationPause = 60,
    isStreaming
  } = options

  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  
  // Track current position in the raw content
  const positionRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(0)

  // Reset function
  const reset = useCallback(() => {
    positionRef.current = 0
    setDisplayedText('')
    setIsTyping(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Reset when streaming starts fresh
  useEffect(() => {
    if (isStreaming && rawContent === '') {
      const frame = requestAnimationFrame(() => {
        reset()
      })

      return () => {
        cancelAnimationFrame(frame)
      }
    }
  }, [isStreaming, rawContent, reset])

  // Main typing animation effect
  useEffect(() => {
    if (!isStreaming && !rawContent) {
      return
    }

    // If we've already displayed everything, nothing to do
    if (positionRef.current >= rawContent.length) {
      const frame = requestAnimationFrame(() => {
        setIsTyping(false)
      })

      return () => {
        cancelAnimationFrame(frame)
      }
    }

    const typingFrame = requestAnimationFrame(() => {
      setIsTyping(true)
    })

    const revealNext = () => {
      const now = performance.now()
      const timeSinceLastUpdate = now - lastUpdateRef.current

      // If we're catching up (buffer is larger than what's displayed), speed up
      const bufferSize = rawContent.length - positionRef.current
      const speedMultiplier = bufferSize > 50 ? 0.3 : bufferSize > 20 ? 0.6 : 1

      // Determine how many characters to reveal this frame
      const currentChar = rawContent[positionRef.current]
      const isPunctuation = /[.!?,;:]/.test(currentChar || '')
      const isWordBoundary = /\s/.test(currentChar || '')

      // Calculate delay for this character
      let delay = charDelay * speedMultiplier
      
      if (isPunctuation) {
        delay += punctuationPause * speedMultiplier
      }

      // Clamp delay
      delay = Math.max(minDelay, Math.min(maxDelay, delay))

      if (timeSinceLastUpdate >= delay || timeSinceLastUpdate === 0) {
        // Reveal character(s) - when catching up, reveal by word
        let charsToReveal = 1
        
        if (bufferSize > 30 && isWordBoundary) {
          // Find next word boundary for faster catch-up
          const nextSpace = rawContent.indexOf(' ', positionRef.current + 1)
          if (nextSpace > 0 && nextSpace - positionRef.current < 15) {
            charsToReveal = nextSpace - positionRef.current + 1
          }
        }

        positionRef.current = Math.min(
          positionRef.current + charsToReveal,
          rawContent.length
        )
        
        setDisplayedText(rawContent.slice(0, positionRef.current))
        lastUpdateRef.current = now
      }

      // Continue if there's more to reveal
      if (positionRef.current < rawContent.length) {
        animationFrameRef.current = requestAnimationFrame(revealNext)
      } else {
        setIsTyping(false)
      }
    }

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(revealNext)

    return () => {
      cancelAnimationFrame(typingFrame)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [
    rawContent,
    isStreaming,
    charDelay,
    minDelay,
    maxDelay,
    punctuationPause
  ])

  // When streaming stops, quickly finish revealing remaining content
  useEffect(() => {
    if (!isStreaming && rawContent && positionRef.current < rawContent.length) {
      // Speed up to finish revealing
      const finishRevealing = () => {
        const remaining = rawContent.length - positionRef.current
        const charsPerFrame = Math.max(3, Math.ceil(remaining / 20))
        
        positionRef.current = Math.min(
          positionRef.current + charsPerFrame,
          rawContent.length
        )
        
        setDisplayedText(rawContent.slice(0, positionRef.current))

        if (positionRef.current < rawContent.length) {
          animationFrameRef.current = requestAnimationFrame(finishRevealing)
        } else {
          setIsTyping(false)
        }
      }

      animationFrameRef.current = requestAnimationFrame(finishRevealing)
    }
  }, [isStreaming, rawContent])

  return {
    displayedText,
    isTyping,
    reset
  }
}

export default useStreamingText
