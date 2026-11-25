import { createContext } from 'react'

// Settings can reopen the review without replacing the authenticated workspace or its routing.
export const RosterReviewContext = createContext<(() => void) | undefined>(undefined)
