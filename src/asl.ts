/* eslint-disable @typescript-eslint/naming-convention */

/**
 * StateMachine
 */
export interface StateMachine {
  StartAt: string;
  States: { [state: string]: State };
}

export interface BaseState {
  Id: string;
  Name: string;
  Type: string;
  Next?: string;
  Catch?: Catcher[];
  End: boolean;
}

export const enum StateType {
  Pass = 'Pass',
  Task = 'Task',
  Choice = 'Choice',
  Wait = 'Wait',
  Succeed = 'Succeed',
  Fail = 'Fail',
  Parallel = 'Parallel',
  Map = 'Map'
};


export type State = PassState | TaskState | ChoiceState | WaitState |
  SucceedState | FailState | ParallelState | MapState;

export interface PassState extends BaseState {
  Type: StateType.Pass;
}

export interface TaskState extends BaseState {
  Type: StateType.Task;
}

export interface ChoiceState extends BaseState {
  Type: StateType.Choice;
  Choices: {
    Next: string;
  }[];
  Default?: string;
}

export interface WaitState extends BaseState {
  Type: StateType.Wait;
  Seconds?: number;
  Timestamp?: string;
  SecondsPath?: string;
  TimestampPath?: string;
}

export interface SucceedState extends BaseState {
  Type: StateType.Succeed;
}

export interface FailState extends BaseState {
  Type: StateType.Fail;
  Cause?: string;
  Error?: string;
}

export interface ParallelState extends BaseState {
  Type: StateType.Parallel;
  Branches: StateMachine[];
  Retry: Retrier[];
}

export interface MapState extends BaseState {
  Type: StateType.Map;
  Iterator: StateMachine;
  MaxConcurrency: number;
}

export interface Retrier {
  ErrorEquals: string[];
  IntervalSeconds?: number;
  MaxAttempts?: number;
  BackoffRate?: number;
}

export interface Catcher {
  ErrorEquals: string[];
  Next: string;
  ResultPath?: string;
}

export const AslKeywords = [
  'Ref',
  'GetAtt',
  'Join'
];
