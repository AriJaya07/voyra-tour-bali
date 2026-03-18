"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-center">
            <p className="text-red-700 font-medium text-sm mb-2">Something went wrong</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-sm text-blue-600 hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
