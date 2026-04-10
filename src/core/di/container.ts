// Dependency Injection Container
// Provides loose coupling and testability

export type Token<T> = symbol & { __type: T }

export interface Provider<T> {
  provide: Token<T>
  useClass?: new (...args: any[]) => T
  useFactory?: (...args: any[]) => T
  useValue?: T
  deps?: Token<any>[]
  singleton?: boolean
}

export class DIContainer {
  private registry = new Map<symbol, Provider<any>>()
  private singletons = new Map<symbol, any>()
  private scopes = new Map<string, DIContainer>()

  // Register a provider
  register<T>(provider: Provider<T>): void {
    this.registry.set(provider.provide as symbol, provider)
  }

  // Register a class
  registerClass<T>(token: Token<T>, useClass: new (...args: any[]) => T, deps: Token<any>[] = [], singleton = true): void {
    this.registry.set(token as symbol, { provide: token, useClass, deps, singleton })
  }

  // Register a factory
  registerFactory<T>(token: Token<T>, useFactory: (...args: any[]) => T, deps: Token<any>[] = []): void {
    this.registry.set(token as symbol, { provide: token, useFactory, deps, singleton: false })
  }

  // Register a value
  registerValue<T>(token: Token<T>, useValue: T): void {
    this.registry.set(token as symbol, { provide: token, useValue, singleton: true })
  }

  // Resolve a dependency
  resolve<T>(token: Token<T>): T {
    const key = token as symbol
    const provider = this.registry.get(key)

    if (!provider) {
      throw new Error(`No provider found for token: ${key.toString()}`)
    }

    // Return cached singleton
    if (provider.singleton && this.singletons.has(key)) {
      return this.singletons.get(key)
    }

    let instance: T

    if (provider.useValue !== undefined) {
      instance = provider.useValue
    } else if (provider.useFactory) {
      const deps = provider.deps?.map(dep => this.resolve(dep)) ?? []
      instance = provider.useFactory(...deps)
    } else if (provider.useClass) {
      const deps = provider.deps?.map(dep => this.resolve(dep)) ?? []
      instance = new provider.useClass(...deps)
    } else {
      throw new Error(`Invalid provider for token: ${key.toString()}`)
    }

    // Cache singleton
    if (provider.singleton) {
      this.singletons.set(key, instance)
    }

    return instance
  }

  // Check if a token is registered
  has<T>(token: Token<T>): boolean {
    return this.registry.has(token as symbol)
  }

  // Create a child scope
  createScope(name: string): DIContainer {
    const scope = new DIContainer()
    this.scopes.set(name, scope)
    return scope
  }

  // Get a scope
  getScope(name: string): DIContainer | undefined {
    return this.scopes.get(name)
  }

  // Clear all registrations
  clear(): void {
    this.registry.clear()
    this.singletons.clear()
    this.scopes.clear()
  }

  // Get all registered tokens
  getRegisteredTokens(): symbol[] {
    return Array.from(this.registry.keys())
  }
}

// Global container instance
export const container = new DIContainer()

// Decorator for injecting dependencies
export function Inject<T>(token: Token<T>) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata('design:paramtypes', target) || []
    existingTokens[parameterIndex] = token
    Reflect.defineMetadata('design:paramtypes', existingTokens, target)
  }
}

// Create token helper
export function createToken<T>(name: string): Token<T> {
  return Symbol(name) as Token<T>
}

// Injectable decorator
export function Injectable(token?: Token<any>) {
  return function <T extends new (...args: any[]) => {}>(constructor: T) {
    if (token) {
      container.registerClass(token, constructor)
    }
    return constructor
  }
}
