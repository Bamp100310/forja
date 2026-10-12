import React from 'react'

import motoImg from '../../assets/forja/sprites/moto.png'
import motoLargeImg from '../../assets/forja/sprites/moto_large.png'
import jerrycanImg from '../../assets/forja/sprites/jerrycan.png'
import toolsImg from '../../assets/forja/sprites/tools.png'
import coinsImg from '../../assets/forja/sprites/coins.png'
import parcelImg from '../../assets/forja/sprites/parcel.png'
import gaugeImg from '../../assets/forja/sprites/gauge.png'
import strongboxImg from '../../assets/forja/sprites/strongbox.png'
import cogImg from '../../assets/forja/sprites/cog.png'
import ledgerImg from '../../assets/forja/sprites/ledger.png'
import ledgerCheckImg from '../../assets/forja/sprites/ledger_check.png'
import helmetImg from '../../assets/forja/sprites/helmet.png'
import chainImg from '../../assets/forja/sprites/chain.png'
import chainBrokenImg from '../../assets/forja/sprites/chain_broken.png'
import iouImg from '../../assets/forja/sprites/iou.png'
import calendarImg from '../../assets/forja/sprites/calendar.png'
import flagImg from '../../assets/forja/sprites/flag.png'
import blueprintImg from '../../assets/forja/sprites/blueprint.png'
import leverImg from '../../assets/forja/sprites/lever.png'
import conveyorImg from '../../assets/forja/sprites/conveyor.png'
import sackImg from '../../assets/forja/sprites/sack.png'
import emptyCrateImg from '../../assets/forja/sprites/empty_crate.png'
import emptyBenchImg from '../../assets/forja/sprites/empty_bench.png'

export type PixelSpriteName =
  | 'moto'
  | 'moto_large'
  | 'jerrycan'
  | 'wrench'
  | 'tools'
  | 'coins'
  | 'ingot'
  | 'gauge'
  | 'cargo'
  | 'parcel'
  | 'anvil'
  | 'cog'
  | 'flame'
  | 'conveyor'
  | 'bolt'
  | 'vault'
  | 'strongbox'
  | 'creditCard'
  | 'iou'
  | 'handshake'
  | 'sack'
  | 'helmet'
  | 'chain'
  | 'chain_broken'
  | 'calendar'
  | 'flag'
  | 'blueprint'
  | 'lever'
  | 'ledger'
  | 'ledger_check'
  | 'empty_crate'
  | 'empty_bench'

const SPRITE_MAP: Record<PixelSpriteName, string> = {
  moto: motoImg,
  moto_large: motoLargeImg,
  jerrycan: jerrycanImg,
  wrench: toolsImg,
  tools: toolsImg,
  coins: coinsImg,
  ingot: coinsImg,
  gauge: gaugeImg,
  cargo: parcelImg,
  parcel: parcelImg,
  anvil: cogImg,
  cog: cogImg,
  flame: leverImg,
  conveyor: conveyorImg,
  bolt: leverImg,
  vault: strongboxImg,
  strongbox: strongboxImg,
  creditCard: iouImg,
  iou: iouImg,
  handshake: sackImg,
  sack: sackImg,
  helmet: helmetImg,
  chain: chainImg,
  chain_broken: chainBrokenImg,
  calendar: calendarImg,
  flag: flagImg,
  blueprint: blueprintImg,
  lever: leverImg,
  ledger: ledgerImg,
  ledger_check: ledgerCheckImg,
  empty_crate: emptyCrateImg,
  empty_bench: emptyBenchImg,
}

interface PixelSpriteProps {
  name: PixelSpriteName
  size?: number
  className?: string
  alt?: string
}

export const PixelSprite: React.FC<PixelSpriteProps> = ({
  name,
  size = 24,
  className = '',
  alt = '',
}) => {
  const src = SPRITE_MAP[name] || toolsImg

  return (
    <img
      src={src}
      alt={alt || name}
      width={size}
      height={size}
      className={`inline-block pixel-art object-contain shrink-0 select-none pointer-events-none ${className}`}
      style={{
        imageRendering: 'pixelated',
        width: `${size}px`,
        height: `${size}px`,
      }}
      loading="lazy"
    />
  )
}
