/* eslint-disable @typescript-eslint/naming-convention */
import { TextDocument } from "vscode";
import { AslKeywords, ChoiceState, State, StateMachine, StateType } from "./asl";

import * as yaml from "js-yaml";

/* Magic keyword. Indicates the prefix for the states at zero-depth. */
const ZERO_DEPTH_PREFIX = 'stm0';

/**
 * Context that stores the states.
 */
class Context {
  /* depth that is auto increment */
  depth: number = 0;

  /* States */
  startState?: State;
  lastState?: State;
  states: { [id: string]: State } = {};

  /**
   * Mermaid lines for the states that have End set to true.
   * We use this to connect the states with End state.
   */
  endStatesLine: string[] = [];

  constructor() {}

  /**
   * Returns id that is auto increment number from zero.
   *
   * @returns
   */
  getId(): string {
    return `stm${this.depth++}`;
  }

  /**
   * Registers the given state.
   *
   * @param id
   * @param state
   */
  registerState(id: string, state: State) {
    this.states[id] = state;
  }

  /**
   * Returns the corresponding state.
   *
   * @param id
   * @returns
   */
  getState(id: string) {
    // TODO: handle exception.
    return this.states[id];
  }

  setStartState(state: State) {
    if (this.startState === undefined) {
      this.startState = state;
    }
  }

  setLastState(state: State) {
    this.lastState = state;
  }

  getStartState() {
    return this.startState;
  }

  getLastState() {
    return this.lastState;
  }

  // TODO: Maybe it'd better to destroy and create a new one.
  // Currently, it is called in the parse function.
  reset() {
    this.depth = 0;
    this.states = {};
    this.endStatesLine = [];
  }
}

/**
 * Asl Parser.
 */
export class AslParser {
  direction: string = 'TB';

  constructor(private context = new Context()) {}

  /**
   * Returns state id.
   * The state id is composed of the given id and escaped name.
   *
   * @param id
   * @param name
   * @returns
   */
  getStateId(id: string, name: string) {
    return `${id}-${name.replace(/[^\w\s]/g, "").replaceAll(" ", "")}`;
  }

  /**
   * Returns state id of the given State.
   *
   * @param state
   * @returns
   */
  getStateIdOf(state: State) {
    return this.getStateId(state.Id, state.Name);
    // return `${state.Id}-${state.Name.replace(/[^\w\s]/g, "").replaceAll(
    //   " ",
    //   ""
    // )}`;
  }

  /**
   * Strips tags from the given document.
   *
   * @param doc
   * @returns clean text stripped of Asl Tags
   */
  stripTags(text: string) {
    const regexp = AslKeywords.map(
      (keyword) => new RegExp(`!${keyword} `, "g")
    );
    return regexp.reduce((t, regexp) => t.replace(regexp, ""), text);
  }

  isValidAslFormat(stm: StateMachine): boolean {
    return !((stm.StartAt === undefined) || (stm.StartAt === undefined))
  }

  /**
   * Parse the doc.
   * 
   * @param doc 
   * @returns parsed, complete mermaid text.
   */
  parse(text: string): string | undefined {
    this.context.reset();
    const stripped = this.stripTags(text);
    const stm = yaml.load(stripped) as StateMachine;

    if (!this.isValidAslFormat(stm)) {
      return undefined;
    }

    const result = this.parseStateMachine(stm);

    // const startStateName = this.getStateIdOf(this.context.getFirstState());
    // const endStateName = this.getStateIdOf(this.context.getLastState());

    // Start:::started --> ${startStateName}
    // ${endStateName} --> End:::ended
    return `
      flowchart ${this.direction}
      ${result}
      ${this.context.endStatesLine.join("\n")}
      classDef started fill:#008855, color:#fff;
      classDef ended fill:#000099, color:#fff;
      classDef succeed fill:#006600, color:#fff;
      classDef fail fill:#880000, color:#fff;
    `;
  }

  private parseStateMachine(stm: StateMachine) {
    const id = this.context.getId();

    const idGenerator = (name: string) => `${this.getStateId(id, name)}`;

    // Output value
    let result = "";

    // Iterates all the states of state machine.
    for (const stateName of Object.keys(stm.States)) {
      // assigns id and state name to the state obj.
      const state = stm.States[stateName];
      state.Id = id;
      state.Name = stateName;
      this.context.setStartState(state);
      this.context.registerState(id, state);

      // TODO: better logic below.
      // Currently, all the states that have End set to true in the first depth
      // are stored to connect the states with End state.
      if (id === ZERO_DEPTH_PREFIX && state.End) {
        this.context.endStatesLine.push(
          `${idGenerator(stateName)} --> End:::ended`
        );
        // remains only the last End state.
        this.context.setLastState(state);
      }

      result += `${this.parseState(state, stateName, idGenerator)}\n`;

      if (state.Next) {
        switch (state.Type) {
          // Wait draws a waiting time between states.
          case StateType.Wait:
            let waiting = "";
            
            // Must specify exactly one of Seconds, Timestamp,
            // SecondsPath, or TimestampPath.
            // TODO: handle SecondPath and TimestampPath.
            if (state.Seconds) {
              waiting = `Waiting for ${state.Seconds}s`;
            } else if (state.Timestamp) {
              waiting = `Waiting until ${state.Timestamp}`;
            } else {
              // TODO: handle variables.
              waiting = `Waiting for $variable`;
            }

            result += ` --> |${waiting}| ${idGenerator(state.Next)}`;
            break;

          case StateType.Parallel:
            result += `${idGenerator(stateName)} --> ${idGenerator(state.Next)}`;
            break;

          default:
            result += ` --> ${idGenerator(state.Next)}`;
        }
        result += '\n';
      }

      if (state.Catch) {
        for (const catcher of state.Catch) {
          result += `${idGenerator(stateName)} --> ${idGenerator(
            catcher.Next
          )}\n`;
        }
      }
    }

    return result;
  }

  /**
   * Parse state.
   *
   * @param state
   * @param name
   * @param idGenerator
   * @returns
   */
  parseState(state: State, name: string, idGenerator: (key: string) => string) {
    const displayName = `${idGenerator(name)}["${name}"]`;
    switch (state.Type) {
      case StateType.Pass:
      case StateType.Task:
      case StateType.Wait:
        return displayName;

      case StateType.Succeed:
        return `${displayName}:::succeed`;
      case StateType.Fail:
        return `${displayName}:::fail`;

      case StateType.Parallel:
        return `
          subgraph ${idGenerator(name)}[Parallel: ${name}]
          direction TB
          ${state.Branches.map((branch) => this.parseStateMachine(branch)).join(
            "\n"
          )}
          end
        `;

      case StateType.Map:
        return `
          subgraph ${idGenerator(name)}[Map: ${name}]
          direction TB
          ${this.parseStateMachine(state.Iterator)}
          end
          ${idGenerator(name)}
        `;

      case StateType.Choice:
        return `${this.parseChoice(state as ChoiceState, name, idGenerator)}`;
    }
  }

  parseChoice(
    state: ChoiceState,
    name: string,
    idGenerator: (key: string) => string
  ) {
    let result = "";
    
    // queue for next states
    const nextStates: string[] = [];

    const pushToNext = (s: string): void => {
      if (!nextStates.includes(s)) {
        nextStates.push(s);
      }
    };

    for (const { Next } of state.Choices) {
      pushToNext(Next);
    }
    if (state.Default != null) {
      pushToNext(state.Default);
    }

    for (const next of nextStates) {
      result += `${idGenerator(name)}{${name}} --> ${idGenerator(
        next
      )}[${next}]\n`;
    }
    return result;
  }
}
