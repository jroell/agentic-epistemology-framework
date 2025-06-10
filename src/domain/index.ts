/**
 * Domain Adapter Module
 * 
 * This module provides the domain adapter architecture that allows
 * the framework to be extended for different domains without modifying
 * core classes.
 */

// Core domain adapter interfaces and classes
export {
  DomainAdapter,
  BaseDomainAdapter,
  GenericDomainAdapter,
  DomainAdapterRegistry,
  DomainOperation,
  DomainOperationParams,
  DomainOperationResult
} from './domain-adapter';

// Specific domain implementations
export { DebateAdapter } from './debate-adapter';

// Future domain adapters can be exported here:
// export { NegotiationAdapter } from './negotiation-adapter';
// export { MediationAdapter } from './mediation-adapter';
// export { EducationAdapter } from './education-adapter';