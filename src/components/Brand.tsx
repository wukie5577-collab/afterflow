import { Crosshair } from 'lucide-react'

export function Brand({ onClick }: { onClick?: () => void }) {
  return <button className="brand" onClick={onClick} aria-label="Return to AFTERFLOW home"><Crosshair size={26} strokeWidth={1}/><span>AFTERFLOW</span></button>
}
