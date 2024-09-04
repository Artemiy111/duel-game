import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react'

class Mouse {
  constructor(public x: number, public y: number) {}
}

class Game {
  private _heroes = [
    new Hero(
      this._canvas,
      this._ctx,
      this._mouse,
      30,
      this._canvas.height / 2,
      2,
      this._playerScoreChangeCallback,
    ),
    new Hero(
      this._canvas,
      this._ctx,
      this._mouse,
      this._canvas.width - 30,
      this._canvas.height / 2,
      3,
      this._enemyScoreChangeCallback,
      1000,
      -1,
      false,
    ),
  ]
  private _animationId: number = null!
  constructor(
    private _canvas: HTMLCanvasElement,
    private _ctx: CanvasRenderingContext2D,
    private _mouse: Mouse,
    private _playerScoreChangeCallback: (score: number) => void,
    private _enemyScoreChangeCallback: (score: number) => void,
  ) {}

  public start() {
    this._animate()
  }

  private _animate() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)
    this._tick()
    this._draw()
    this._animationId = requestAnimationFrame(() => this._animate())
  }
  private _tick() {
    this._heroes.forEach(hero => {
      hero.tick()
      hero.spells.forEach(spell => spell.tick())
    })

    this.player.spells.forEach(spell => {
      if (spell.isCollidesWithHero(this.enemy)) {
        this.player.incrementScore()
        this.player.deleteSpell(spell)
      }
    })
    this.enemy.spells.forEach(spell => {
      if (spell.isCollidesWithHero(this.player)) {
        this.enemy.incrementScore()
        this.enemy.deleteSpell(spell)
      }
    })
  }

  private _draw() {
    this._heroes.forEach(hero => {
      hero.draw()
      hero.spells.forEach(spell => spell.draw())
    })
  }

  public stop() {
    cancelAnimationFrame(this._animationId)
  }

  get player() {
    return this._heroes[0]
  }

  get enemy() {
    return this._heroes[1]
  }
}

class Hero {
  private _radius = 20
  private _spells: Spell[] = []
  private _lastSpell = Date.now()
  private _score = 0
  private _color = this._isPlayer ? 'blue' : 'red'
  private _spellColor = this._isPlayer ? 'blue' : 'red'

  constructor(
    private _canvas: HTMLCanvasElement,
    private _ctx: CanvasRenderingContext2D,
    private _mouse: Mouse,
    private _x: number,
    private _y: number,
    private _speed: number,
    private _scoreChangeCallback: (score: number) => void,
    private _fireRate: number = 1000,
    private _direction: -1 | 1 = 1,
    private _isPlayer: boolean = true,
  ) {}

  public draw() {
    this._ctx.beginPath()
    this._ctx.arc(this._x, this._y, this._radius, 0, 2 * Math.PI)
    this._ctx.fillStyle = this._color
    this._ctx.fill()
    this._ctx.closePath()
  }

  public tick() {
    this._y += this._speed * this._direction
    if (this._y < this._radius || this._y > this._canvas.height - this._radius) {
      this._direction *= -1
    }
    if (
      this._isPlayer &&
      Math.abs(this._y - this._mouse.y) <= this.radius &&
      Math.abs(this._x - this._mouse.x) <= this._radius
    ) {
      this._direction *= -1
    }
    this.fire()
  }

  public fire() {
    const now = Date.now()
    if (now - this._lastSpell >= this._fireRate) {
      this._lastSpell = now
      const spell = new Spell(
        this._canvas,
        this._ctx,
        this._x,
        this.y,
        this._spellColor,
        this._isPlayer,
      )
      this._spells.push(spell)
    }
  }

  public set speed(value: number) {
    this._speed = value
  }

  public set fireRate(value: number) {
    this._fireRate = value
  }

  public get x() {
    return this._x
  }

  public get y() {
    return this._y
  }

  public get radius() {
    return this._radius
  }

  public get spells() {
    return this._spells as Readonly<Spell[]>
  }

  public get score() {
    return this._score
  }

  public incrementScore() {
    this._score += 1
    this._scoreChangeCallback?.(this.score)
  }

  public deleteSpell(spell: Spell) {
    this._spells = this.spells.filter(s => s !== spell)
  }

  public set spellColor(value: string) {
    this._spellColor = value
  }
}

class Spell {
  private _radius = 10
  private _speed = 10
  private _direction = 1

  constructor(
    private _canvas: HTMLCanvasElement,
    private _ctx: CanvasRenderingContext2D,
    private _x: number,
    private _y: number,
    private _color: string,
    private _isPlayer = true,
  ) {
    this._direction = _isPlayer ? 1 : -1
  }

  public draw() {
    this._ctx.beginPath()
    this._ctx.arc(this._x, this._y, this._radius, 0, 2 * Math.PI)
    this._ctx.fillStyle = this._color
    this._ctx.fill()
    this._ctx.closePath()
  }

  public tick() {
    this._x += this._speed * this._direction
  }

  public get isOutOfBounds() {
    return this._x < this._radius || this._x > this._canvas.width - this._radius
  }

  public isCollidesWithHero(hero: Hero) {
    const dx = this._x - hero.x
    const dy = this._y - hero.y
    return Math.sqrt(dx * dx + dy * dy) < this._radius + hero.radius
  }
}

export default function App() {
  const dialog = useRef<HTMLDialogElement>(null!)
  const canvas = useRef<HTMLCanvasElement>(null!)
  const ctx = useRef<CanvasRenderingContext2D>(null!)
  const mouse = useRef(new Mouse(0, 0))
  const game = useRef<Game>(null!)

  const [playerScore, setPlayerScore] = useState(0)
  const [enemyScore, setEnemyScore] = useState(0)

  useEffect(() => {
    console.log(canvas.current)
    canvas.current.width = window.innerWidth
    canvas.current.height = window.innerHeight - 80
    ctx.current = canvas.current.getContext('2d')!

    game.current = new Game(
      canvas.current,
      ctx.current,
      mouse.current,
      setPlayerScore,
      setEnemyScore,
    )
    game.current.start()

    return () => {
      game.current.stop()
    }
  }, [])

  function onMouseMove(e: MouseEvent<HTMLCanvasElement>) {
    mouse.current.x = e.clientX
    mouse.current.y = e.clientY
  }

  function setHeroSpeed(e: FormEvent<HTMLInputElement>, isPlayer: boolean = true) {
    const speed = parseFloat(e.currentTarget.value)
    if (isPlayer) game.current.player.speed = speed
    else game.current.enemy.speed = speed
  }
  function setHeroFireRate(e: FormEvent<HTMLInputElement>, isPlayer: boolean = true) {
    const fireRate = parseFloat(e.currentTarget.value)
    if (isPlayer) game.current.player.fireRate = fireRate
    else game.current.enemy.fireRate = fireRate
  }

  const heroForSpellColorChange = useRef<Hero>(null!)

  function onClick(e: MouseEvent<HTMLCanvasElement>) {
    const x = e.clientX
    const y = e.clientY

    const isPlayerClicked =
      Math.abs(game.current.player.x - mouse.current.x) <= game.current.player.radius &&
      Math.abs(game.current.player.y - mouse.current.y) <= game.current.player.radius
    const isEnemyClicked =
      Math.abs(game.current.enemy.x - x) <= game.current.enemy.radius &&
      Math.abs(game.current.enemy.y - y) <= game.current.enemy.radius

    if (isPlayerClicked) {
      heroForSpellColorChange.current = game.current.player
      dialog.current.showModal()
      mouse.current.x = 0
      mouse.current.y = 0
    } else if (isEnemyClicked) {
      heroForSpellColorChange.current = game.current.enemy
      dialog.current.showModal()
      mouse.current.x = 0
      mouse.current.y = 0
    }
  }

  function changeColor(e: FormEvent<HTMLInputElement>) {
    const color = e.currentTarget.value
    heroForSpellColorChange.current.spellColor = color
  }

  return (
    <>
      <dialog ref={dialog}>
        <input type="color" onChange={changeColor} />
      </dialog>
      <canvas onClick={onClick} onMouseMove={onMouseMove} ref={canvas} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fef',
          height: '80px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <label>
            Скорость движения
            <input onInput={e => setHeroSpeed(e)} type="range" min="0" max="5" step="0.1" />
          </label>
          <label>
            Частота стрельбы
            <input
              onInput={e => setHeroFireRate(e)}
              type="range"
              min="1000"
              max="5000"
              step="1000"
            />
          </label>
        </div>
        <div className="">
          {playerScore} : {enemyScore}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <label>
            Скорость движения
            <input onInput={e => setHeroSpeed(e, false)} type="range" min="0" max="5" step="0.1" />
          </label>
          <label>
            Частота стрельбы
            <input
              onInput={e => setHeroFireRate(e, false)}
              type="range"
              min="1000"
              max="5000"
              step="1000"
            />
          </label>
        </div>
      </div>
    </>
  )
}
