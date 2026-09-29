(function(global, factory) {
	typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global["block-model"] = {}));
})(this, function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/plugin_handle.js
	const PLUGIN_OUTPUT_PREFIX = "plugin-output#";
	/** Construct the output key for a plugin output in the block outputs map. */
	function pluginOutputKey(handle, outputKey) {
		return `${PLUGIN_OUTPUT_PREFIX}${handle}#${outputKey}`;
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/block_storage.js
	/**
	* Discriminator key for BlockStorage format detection.
	* This unique hash-based key identifies data as BlockStorage vs legacy formats.
	*/
	const BLOCK_STORAGE_KEY = "__pl_a7f3e2b9__";
	/**
	* Default data version for new blocks without migrations.
	* Unique identifier ensures blocks are created via DataModel API.
	*/
	const DATA_MODEL_LEGACY_VERSION = "__pl_v1_d4e8f2a1__";
	/**
	* Type guard to check if a value is a valid BlockStorage object.
	* Checks for the discriminator key and valid schema version.
	*/
	function isBlockStorage(value) {
		if (value === null || typeof value !== "object") return false;
		return value[BLOCK_STORAGE_KEY] === "v1";
	}
	/**
	* Creates a BlockStorage with the given initial data
	*
	* @param initialData - The initial data value (defaults to empty object)
	* @param version - The initial data version key (defaults to DATA_MODEL_LEGACY_VERSION)
	* @returns A new BlockStorage instance with discriminator key
	*/
	function createBlockStorage(initialData = {}, version = DATA_MODEL_LEGACY_VERSION) {
		return {
			[BLOCK_STORAGE_KEY]: "v1",
			__dataVersion: version,
			__data: initialData,
			__pluginRegistry: {},
			__plugins: {}
		};
	}
	/**
	* Normalizes raw storage data to BlockStorage format.
	* If the input is already a BlockStorage, returns it as-is (with defaults for missing fields).
	* If the input is legacy format (raw state), wraps it in BlockStorage structure.
	*
	* @param raw - Raw storage data (may be legacy format or BlockStorage)
	* @returns Normalized BlockStorage
	*/
	function normalizeBlockStorage(raw) {
		if (isBlockStorage(raw)) {
			const storage = raw;
			return {
				...storage,
				__dataVersion: typeof storage.__dataVersion === "number" ? DATA_MODEL_LEGACY_VERSION : storage.__dataVersion,
				__pluginRegistry: storage.__pluginRegistry ?? {},
				__plugins: storage.__plugins ?? {}
			};
		}
		return createBlockStorage(raw);
	}
	/**
	* Gets the data from BlockStorage
	*
	* @param storage - The BlockStorage instance
	* @returns The data value
	*/
	function getStorageData(storage) {
		return storage.__data;
	}
	/**
	* Updates the data in BlockStorage (immutable)
	*
	* @param storage - The current BlockStorage
	* @param payload - The update payload with operation and value
	* @returns A new BlockStorage with updated data
	*/
	function updateStorageData(storage, payload) {
		switch (payload.operation) {
			case "update-block-data": return {
				...storage,
				__data: payload.value
			};
			case "update-plugin-data": {
				const { pluginId, value } = payload;
				const currentPlugins = storage.__plugins ?? {};
				const version = currentPlugins[pluginId]?.__dataVersion ?? "__pl_v1_d4e8f2a1__";
				return {
					...storage,
					__plugins: {
						...currentPlugins,
						[pluginId]: {
							__dataVersion: version,
							__data: value
						}
					}
				};
			}
			default: throw new Error(`Unknown storage operation: ${payload.operation}`);
		}
	}
	/**
	* Performs atomic migration of block storage including block data and all plugins.
	*
	* Migration is atomic: either everything succeeds and a new storage is returned,
	* or an error is returned and the original storage is completely untouched.
	*
	* Migration steps:
	* 1. Migrate block data
	* 2. For each plugin in newPluginRegistry:
	*    - If plugin exists with same name: migrate its data
	*    - Otherwise (new or type changed): create with initial data
	*    Plugins not in newPluginRegistry are dropped.
	*
	* If any step throws, migration fails and original storage is preserved.
	* User can then choose to:
	* - Abort: keep original storage, don't update block
	* - Reset: call createBlockStorage() to start fresh
	*
	* @param storage - The original storage (will not be modified)
	* @param config - Migration configuration
	* @returns Migration result - either success with new storage, or failure with error info
	*
	* @example
	* const result = migrateBlockStorage(storage, {
	*   migrateBlockData: (versioned) => blockDataModel.migrate(versioned),
	*   migratePluginData: (pluginId, versioned) => getPluginModel(pluginId).migrate(versioned),
	*   newPluginRegistry: { table1: 'dataTable' as PluginName },
	*   createPluginData: (pluginId) => getPluginModel(pluginId).getDefaultData(),
	* });
	*
	* if (result.success) {
	*   commitStorage(result.storage);
	* } else {
	*   const userChoice = await askUser(`Migration failed: ${result.error}. Reset data?`);
	*   if (userChoice === 'reset') {
	*     commitStorage(createBlockStorage(initialData, currentVersion));
	*   }
	*   // else: abort, keep original
	* }
	*/
	function migrateBlockStorage(storage, config) {
		const { migrateBlockData, migratePluginData, newPluginRegistry, createPluginData } = config;
		let migratedData;
		let newVersion;
		let transfers;
		try {
			const result = migrateBlockData({
				version: storage.__dataVersion,
				data: storage.__data
			});
			migratedData = result.data;
			newVersion = result.version;
			transfers = result.transfers;
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				failedAt: "block"
			};
		}
		const oldPlugins = storage.__plugins ?? {};
		const oldRegistry = storage.__pluginRegistry ?? {};
		const newPlugins = {};
		for (const [key, pluginName] of Object.entries(newPluginRegistry)) {
			const handle = key;
			const existingEntry = oldPlugins[handle];
			const existingName = oldRegistry[handle];
			try {
				if (existingEntry && existingName === pluginName) {
					const migrated = migratePluginData(handle, {
						version: existingEntry.__dataVersion,
						data: existingEntry.__data
					});
					if (migrated) newPlugins[handle] = {
						__dataVersion: migrated.version,
						__data: migrated.data
					};
				} else if (existingEntry) {
					let recovered = false;
					try {
						const migrated = migratePluginData(handle, {
							version: DATA_MODEL_LEGACY_VERSION,
							data: existingEntry.__data
						});
						if (migrated) {
							newPlugins[handle] = {
								__dataVersion: migrated.version,
								__data: migrated.data
							};
							recovered = true;
						}
					} catch (recoverError) {
						if (!isDataUnrecoverableError(recoverError)) throw recoverError;
					}
					if (!recovered) {
						const transfer = transfers[handle];
						const initial = createPluginData(handle, transfer);
						newPlugins[handle] = {
							__dataVersion: initial.version,
							__data: initial.data
						};
					}
				} else {
					const transfer = transfers[handle];
					const initial = createPluginData(handle, transfer);
					newPlugins[handle] = {
						__dataVersion: initial.version,
						__data: initial.data
					};
				}
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : String(error),
					failedAt: handle
				};
			}
		}
		return {
			success: true,
			storage: {
				[BLOCK_STORAGE_KEY]: "v1",
				__dataVersion: newVersion,
				__data: migratedData,
				__pluginRegistry: newPluginRegistry,
				__plugins: newPlugins
			}
		};
	}
	/**
	* Gets plugin-specific data from block storage.
	* Accepts raw storage (any format) and normalizes internally.
	*
	* When called with a typed PluginHandle<F>, the return type is automatically
	* inferred from the factory's phantom `__types.data` field.
	*
	* @param rawStorage - Raw block storage (may be legacy format or BlockStorage)
	* @param handle - The plugin handle (branded plugin instance id)
	* @returns The plugin data, typed via factory inference
	* @throws If plugin is not found in storage
	*/
	function getPluginData(rawStorage, handle) {
		const pluginEntry = normalizeBlockStorage(rawStorage).__plugins?.[handle];
		if (!pluginEntry) throw new Error(`Plugin '${handle}' not found in block storage`);
		return pluginEntry.__data;
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/block_migrations.js
	/** Create a DataVersioned wrapper with correct shape */
	function makeVersionedData(version, data) {
		return {
			version,
			data
		};
	}
	/** Thrown by recover() to signal unrecoverable data. */
	var DataUnrecoverableError = class extends Error {
		name = "DataUnrecoverableError";
		constructor(dataVersion) {
			super(`Unknown version '${dataVersion}'`);
		}
	};
	function isDataUnrecoverableError(error) {
		return error instanceof Error && error.name === "DataUnrecoverableError";
	}
	/**
	* Default recover function for unknown versions.
	* Use as fallback at the end of custom recover functions.
	*
	* @example
	* .recover((version, data) => {
	*   if (version === 'legacy') {
	*     return transformLegacyData(data);
	*   }
	*   return defaultRecover(version, data);
	* })
	*/
	const defaultRecover = (version, _data) => {
		throw new DataUnrecoverableError(version);
	};
	/** Symbol for internal builder creation method */
	const FROM_BUILDER = Symbol("fromBuilder");
	/**
	* Abstract base for both migration chain types.
	* Holds shared state, buildStep() helper, and init().
	* migrate() cannot be shared due to a TypeScript limitation: when the base class
	* migrate() return type is abstract, subclasses cannot narrow it without losing type safety.
	* Each subclass therefore owns its migrate() with the correct concrete return type.
	*
	* @internal
	*/
	var MigrationChainBase = class {
		versionChain;
		migrationSteps;
		transferSteps;
		constructor(state) {
			this.versionChain = state.versionChain;
			this.migrationSteps = state.steps;
			this.transferSteps = state.transferSteps ?? [];
		}
		/** Appends a migration step and returns the new versionChain and steps arrays. */
		buildStep(nextVersion, fn) {
			if (this.versionChain.includes(nextVersion)) throw new Error(`Duplicate version '${nextVersion}' in migration chain`);
			const step = {
				fromVersion: this.versionChain[this.versionChain.length - 1],
				toVersion: nextVersion,
				migrate: fn
			};
			return {
				versionChain: [...this.versionChain, nextVersion],
				steps: [...this.migrationSteps, step]
			};
		}
		/** Validates uniqueness and records a TransferStep. */
		buildTransfer(target, extract) {
			if (this.transferSteps.some((t) => t.pluginId === target.id)) throw new Error(`Duplicate transfer for plugin '${target.id}'`);
			const entry = {
				pluginId: target.id,
				beforeStepIndex: this.migrationSteps.length,
				extract,
				targetVersion: target.transferVersion
			};
			return { transferSteps: [...this.transferSteps, entry] };
		}
		/** Returns recover-specific fields for DataModel construction. Overridden by WithRecover. */
		recoverState() {
			return {};
		}
		/**
		* Finalize the DataModel with initial data factory.
		*
		* @param initialData - Factory function returning the initial state
		* @returns Finalized DataModel instance
		*/
		init(initialData) {
			return DataModel[FROM_BUILDER]({
				versionChain: this.versionChain,
				steps: this.migrationSteps,
				transferSteps: this.transferSteps,
				initialDataFn: initialData,
				...this.recoverState()
			});
		}
	};
	/**
	* Migration chain after recover() or upgradeLegacy() has been called.
	* Further migrate() and transfer() calls are allowed; recover() and upgradeLegacy() are not
	* (enforced by type — no such methods on this class).
	*
	* @typeParam Current - Data type at the current point in the chain
	* @typeParam Transfers - Accumulated transfer types keyed by plugin ID
	* @internal
	*/
	var DataModelMigrationChainWithRecover = class DataModelMigrationChainWithRecover extends MigrationChainBase {
		recoverFn;
		recoverFromIndex;
		/** @internal */
		constructor(state) {
			super(state);
			this.recoverFn = state.recoverFn;
			this.recoverFromIndex = state.recoverFromIndex;
		}
		recoverState() {
			return {
				recoverFn: this.recoverFn,
				recoverFromIndex: this.recoverFromIndex
			};
		}
		/**
		* Add a migration step. Same semantics as on the base chain.
		* recover() and upgradeLegacy() are not available — one has already been called.
		*/
		migrate(nextVersion, fn) {
			const { versionChain, steps } = this.buildStep(nextVersion, fn);
			return new DataModelMigrationChainWithRecover({
				versionChain,
				steps,
				transferSteps: this.transferSteps,
				recoverFn: this.recoverFn,
				recoverFromIndex: this.recoverFromIndex
			});
		}
		/**
		* Extract data at the current chain position for seeding a new plugin.
		* The extract function's return type must match the plugin's transfer data type.
		* Duplicate plugin IDs are rejected at both type and runtime level.
		*/
		transfer(target, extract) {
			const { transferSteps } = this.buildTransfer(target, extract);
			return new DataModelMigrationChainWithRecover({
				versionChain: this.versionChain,
				steps: this.migrationSteps,
				transferSteps,
				recoverFn: this.recoverFn,
				recoverFromIndex: this.recoverFromIndex
			});
		}
	};
	/**
	* Migration chain builder.
	* Each migrate() call advances the current data type. recover() can be called once
	* at any point — it removes itself from the returned chain so it cannot be called again.
	* Duplicate version keys throw at runtime.
	*
	* @typeParam Current - Data type at the current point in the migration chain
	* @typeParam Transfers - Accumulated transfer types keyed by plugin ID
	* @internal
	*/
	var DataModelMigrationChain = class DataModelMigrationChain extends MigrationChainBase {
		/** @internal */
		constructor({ versionChain, steps = [], transferSteps = [] }) {
			super({
				versionChain,
				steps,
				transferSteps
			});
		}
		/**
		* Add a migration step transforming data from the current version to the next.
		*
		* @typeParam Next - Data type of the next version
		* @param nextVersion - Version key to migrate to (must be unique in the chain)
		* @param fn - Migration function
		* @returns Builder with the next version as current
		*
		* @example
		* .migrate<BlockDataV2>("v2", (v1) => ({ ...v1, labels: [] }))
		*/
		migrate(nextVersion, fn) {
			const { versionChain, steps } = this.buildStep(nextVersion, fn);
			return new DataModelMigrationChain({
				versionChain,
				steps,
				transferSteps: this.transferSteps
			});
		}
		/**
		* Extract data at the current chain position for seeding a new plugin.
		* The extract function's return type must match the plugin's transfer data type.
		* Duplicate plugin IDs are rejected at both type and runtime level.
		*
		* Calling .transfer() on DataModelInitialChain returns DataModelMigrationChain,
		* which removes .upgradeLegacy() from the chain (preventing a problematic combination).
		*
		* @example
		* .from<V1>("v1")
		* .transfer(tablePlugin, (v1) => ({ state: v1.tableState }))
		* .migrate<V2>("v2", ({ tableState: _, ...rest }) => rest)
		*/
		transfer(target, extract) {
			const { transferSteps } = this.buildTransfer(target, extract);
			return new DataModelMigrationChain({
				versionChain: this.versionChain,
				steps: this.migrationSteps,
				transferSteps
			});
		}
		/**
		* Set a recovery handler for unknown or legacy versions.
		*
		* The recover function is called when data has a version not in the migration chain.
		* It must return data of the type at this point in the chain (Current). Any migrate()
		* steps added after recover() will then run on the recovered data.
		*
		* Can only be called once — the returned chain has no recover() method.
		*
		* @param fn - Recovery function returning Current (the type at this chain position)
		* @returns Builder with migrate() and init() but without recover()
		*
		* @example
		* // Recover between migrations — recovered data goes through v3 migration
		* new DataModelBuilder<V1>("v1")
		*   .migrate<V2>("v2", (v1) => ({ ...v1, label: "" }))
		*   .recover((version, data) => {
		*     if (version === 'legacy') return transformLegacy(data); // returns V2
		*     return defaultRecover(version, data);
		*   })
		*   .migrate<V3>("v3", (v2) => ({ ...v2, description: "" }))
		*   .init(() => ({ count: 0, label: "", description: "" }));
		*/
		recover(fn) {
			return new DataModelMigrationChainWithRecover({
				versionChain: this.versionChain,
				steps: this.migrationSteps,
				transferSteps: this.transferSteps,
				recoverFn: fn,
				recoverFromIndex: this.migrationSteps.length
			});
		}
	};
	/**
	* Initial migration chain returned by `.from()`.
	* Extends DataModelMigrationChain with `upgradeLegacy()` — available only before
	* any `.migrate()` calls, since legacy data always arrives at the initial version.
	*
	* @typeParam Current - Data type at the initial version
	* @typeParam Transfers - Accumulated transfer types keyed by plugin ID
	* @internal
	*/
	var DataModelInitialChain = class extends DataModelMigrationChain {
		/**
		* Handle legacy V1 model state ({ args, uiState }) when upgrading a block from
		* BlockModel V1 to BlockModelV3.
		*
		* When a V1 block is upgraded, its stored state `{ args, uiState }` is normalized
		* to the internal default version. This method inserts a migration step from that
		* internal version to the version specified in `.from()`, using the provided typed
		* callback to transform the legacy shape. Non-legacy data passes through unchanged.
		*
		* Must be called right after `.from()` — not available after `.migrate()` calls.
		* Any `.migrate()` steps added after `upgradeLegacy()` will run on the transformed result.
		*
		* Can only be called once — the returned chain has no upgradeLegacy() method.
		* Mutually exclusive with recover().
		*
		* @typeParam Args - Type of the legacy block args
		* @typeParam UiState - Type of the legacy block uiState
		* @param fn - Typed transform from { args, uiState } to Current
		* @returns Builder with migrate() and init() but without recover() or upgradeLegacy()
		*
		* @example
		* type OldArgs = { inputFile: string; threshold: number };
		* type OldUiState = { selectedTab: string };
		* type BlockData = { inputFile: string; threshold: number; selectedTab: string };
		*
		* const dataModel = new DataModelBuilder()
		*   .from<BlockData>("v1")
		*   .upgradeLegacy<OldArgs, OldUiState>(({ args, uiState }) => ({
		*     inputFile: args.inputFile,
		*     threshold: args.threshold,
		*     selectedTab: uiState.selectedTab,
		*   }))
		*   .init(() => ({ inputFile: '', threshold: 0, selectedTab: 'main' }));
		*/
		upgradeLegacy(fn) {
			const wrappedFn = (data) => {
				if (data !== null && typeof data === "object" && "args" in data) return fn(data);
				return data;
			};
			const step = {
				fromVersion: DATA_MODEL_LEGACY_VERSION,
				toVersion: this.versionChain[0],
				migrate: wrappedFn
			};
			return new DataModelMigrationChainWithRecover({
				versionChain: [DATA_MODEL_LEGACY_VERSION, ...this.versionChain],
				steps: [step, ...this.migrationSteps],
				transferSteps: this.transferSteps.map((t) => ({
					...t,
					beforeStepIndex: t.beforeStepIndex + 1
				}))
			});
		}
	};
	/**
	* Builder entry point for creating DataModel with type-safe migrations.
	*
	* @example
	* // Simple (no migrations):
	* const dataModel = new DataModelBuilder()
	*   .from<BlockData>("v1")
	*   .init(() => ({ numbers: [] }));
	*
	* @example
	* // With migrations:
	* const dataModel = new DataModelBuilder()
	*   .from<BlockDataV1>("v1")
	*   .migrate<BlockDataV2>("v2", (v1) => ({ ...v1, labels: [] }))
	*   .migrate<BlockDataV3>("v3", (v2) => ({ ...v2, description: '' }))
	*   .init(() => ({ numbers: [], labels: [], description: '' }));
	*
	* @example
	* // With recover() between migrations — recovered data goes through remaining migrations:
	* const dataModelChain = new DataModelBuilder()
	*   .from<BlockDataV1>("v1")
	*   .migrate<BlockDataV2>("v2", (v1) => ({ ...v1, labels: [] }));
	*
	* // recover() placed before the v3 migration: recovered data goes through v3
	* const dataModel = dataModelChain
	*   .recover((version, data) => {
	*     if (version === 'legacy' && isLegacyData(data)) return transformLegacy(data); // returns V2
	*     return defaultRecover(version, data);
	*   })
	*   .migrate<BlockDataV3>("v3", (v2) => ({ ...v2, description: '' }))
	*   .init(() => ({ numbers: [], labels: [], description: '' }));
	*
	* @example
	* // With upgradeLegacy() — typed upgrade from BlockModel V1 state:
	* type OldArgs = { inputFile: string };
	* type OldUiState = { selectedTab: string };
	* type BlockData = { inputFile: string; selectedTab: string };
	*
	* const dataModel = new DataModelBuilder()
	*   .from<BlockData>("v1")
	*   .upgradeLegacy<OldArgs, OldUiState>(({ args, uiState }) => ({
	*     inputFile: args.inputFile,
	*     selectedTab: uiState.selectedTab,
	*   }))
	*   .init(() => ({ inputFile: '', selectedTab: 'main' }));
	*/
	var DataModelBuilder = class {
		/**
		* Start the migration chain with the given initial data type and version key.
		*
		* @typeParam T - Data type for the initial version
		* @param initialVersion - Version key string (e.g. "v1")
		* @returns Migration chain builder
		*/
		from(initialVersion) {
			return new DataModelInitialChain({ versionChain: [initialVersion] });
		}
	};
	/**
	* DataModel defines the block's data structure, initial values, and migrations.
	* Used by BlockModelV3 to manage data state.
	*
	* Use `new DataModelBuilder()` to create a DataModel.
	*
	* @example
	* // With recover() between migrations:
	* // Recovered data (V2) goes through the v2→v3 migration automatically.
	* const dataModel = new DataModelBuilder()
	*   .from<V1>("v1")
	*   .migrate<V2>("v2", (v1) => ({ ...v1, label: "" }))
	*   .recover((version, data) => {
	*     if (version === "legacy") return transformLegacy(data); // returns V2
	*     return defaultRecover(version, data);
	*   })
	*   .migrate<V3>("v3", (v2) => ({ ...v2, description: "" }))
	*   .init(() => ({ count: 0, label: "", description: "" }));
	*/
	var DataModel = class DataModel {
		/** Latest version key — O(1) access for the common "already current" check. */
		latestVersion;
		/** Maps each known version key to the index of the first step to run from it. O(1) lookup. */
		stepsByFromVersion;
		steps;
		transferSteps;
		initialDataFn;
		recoverFn;
		recoverFromIndex;
		constructor({ versionChain, steps, transferSteps = [], initialDataFn, recoverFn = defaultRecover, recoverFromIndex }) {
			if (versionChain.length === 0) throw new Error("DataModel requires at least one version key");
			this.latestVersion = versionChain[versionChain.length - 1];
			this.stepsByFromVersion = new Map(versionChain.map((v, i) => [v, i]));
			this.steps = steps;
			this.transferSteps = transferSteps;
			this.initialDataFn = initialDataFn;
			this.recoverFn = recoverFn;
			this.recoverFromIndex = recoverFromIndex ?? steps.length;
		}
		/**
		* Internal method for creating DataModel from builder.
		* Uses Symbol key to prevent external access.
		* @internal
		*/
		static [FROM_BUILDER](state) {
			return new DataModel(state);
		}
		/**
		* The latest (current) version key in the migration chain.
		*/
		get version() {
			return this.latestVersion;
		}
		/**
		* Get a fresh copy of the initial data.
		*/
		initialData() {
			return this.initialDataFn();
		}
		/**
		* Get initial data wrapped with current version.
		* Used when creating new blocks or resetting to defaults.
		*/
		getDefaultData() {
			return makeVersionedData(this.latestVersion, this.initialDataFn());
		}
		recoverFrom(data, version) {
			let currentData = this.recoverFn(version, data);
			for (let i = this.recoverFromIndex; i < this.steps.length; i++) currentData = this.steps[i].migrate(currentData);
			return {
				version: this.latestVersion,
				data: currentData
			};
		}
		/**
		* Migrate versioned data from any version to the latest.
		* Collects transfer extractions at their designated chain positions.
		*
		* - If version is in chain, applies needed migrations (O(1) lookup)
		* - If version is unknown, attempts recovery; falls back to initial data
		* - If a migration step fails, throws so the caller can preserve original data
		*
		* Transfers only fire during normal step-by-step migration:
		* - Recovery path: returns empty transfers
		* - Fast-path (already at latest): returns empty transfers
		*
		* @param versioned - Data with version tag
		* @returns Migrated data at the latest version with transfer record
		* @throws If a migration step from a known version fails
		*/
		migrate(versioned) {
			const { version: fromVersion, data } = versioned;
			if (fromVersion === this.latestVersion) return {
				version: this.latestVersion,
				data,
				transfers: {}
			};
			const startIndex = this.stepsByFromVersion.get(fromVersion);
			if (startIndex === void 0) try {
				return {
					...this.recoverFrom(data, fromVersion),
					transfers: {}
				};
			} catch {
				return {
					...this.getDefaultData(),
					transfers: {}
				};
			}
			let currentData = data;
			const transfers = {};
			for (let i = startIndex; i < this.steps.length; i++) {
				for (const t of this.transferSteps) if (t.beforeStepIndex === i) transfers[t.pluginId] = {
					version: t.targetVersion,
					data: t.extract(currentData)
				};
				currentData = this.steps[i].migrate(currentData);
			}
			for (const t of this.transferSteps) if (t.beforeStepIndex >= this.steps.length && t.beforeStepIndex >= startIndex) transfers[t.pluginId] = {
				version: t.targetVersion,
				data: t.extract(currentData)
			};
			return {
				version: this.latestVersion,
				data: currentData,
				transfers
			};
		}
	};
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/internal.js
	/** Utility code helping to identify whether the code is running in actual UI environment */
	function isInUI() {
		return typeof globalThis.getPlatforma !== "undefined" || typeof globalThis.platforma !== "undefined";
	}
	/** Utility code helping to retrieve a platforma instance form the environment */
	function getPlatformaInstance(config) {
		if (config && typeof globalThis.getPlatforma === "function") return globalThis.getPlatforma(config);
		else if (typeof globalThis.platforma !== "undefined") return globalThis.platforma;
		else throw new Error("Can't get platforma instance.");
	}
	function tryGetCfgRenderCtx() {
		if (typeof globalThis.cfgRenderCtx !== "undefined") return globalThis.cfgRenderCtx;
		else return void 0;
	}
	function getCfgRenderCtx() {
		if (typeof globalThis.cfgRenderCtx !== "undefined") return globalThis.cfgRenderCtx;
		else throw new Error("Not in config rendering context");
	}
	function tryRegisterCallback(key, callback) {
		const ctx = tryGetCfgRenderCtx();
		if (ctx === void 0) return false;
		if (key in ctx.callbackRegistry) throw new Error(`Callback with key ${key} already registered.`);
		ctx.callbackRegistry[key] = callback;
		return true;
	}
	/**
	* Registers a callback, replacing any existing callback with the same key.
	* Use this for callbacks that have a default value but can be overridden.
	*
	* @param key - The callback registry key
	* @param callback - The callback function to register
	* @returns true if registered, false if not in render context
	*/
	function replaceCallback(key, callback) {
		const ctx = tryGetCfgRenderCtx();
		if (ctx === void 0) return false;
		ctx.callbackRegistry[key] = callback;
		return true;
	}
	/** Creates a ConfigRenderLambda descriptor without registering a callback. */
	function createRenderLambda(opts) {
		const { handle, ...flags } = opts;
		return {
			__renderLambda: true,
			handle,
			...flags
		};
	}
	/** Registers a callback and returns a ConfigRenderLambda descriptor. */
	function createAndRegisterRenderLambda(opts, replace) {
		const { handle, lambda, ...flags } = opts;
		if (replace) replaceCallback(handle, lambda);
		else tryRegisterCallback(handle, lambda);
		return createRenderLambda({
			handle,
			...flags
		});
	}
	const futureResolves = /* @__PURE__ */ new Map();
	function registerFutureAwait(handle, onResolve) {
		if (!(handle in getCfgRenderCtx().callbackRegistry)) {
			getCfgRenderCtx().callbackRegistry[handle] = (value) => {
				for (const res of futureResolves.get(handle)) res(value);
			};
			futureResolves.set(handle, []);
		}
		futureResolves.get(handle).push(onResolve);
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/block_storage_facade.js
	/**
	* All facade callback names as constants.
	* These are the source of truth - the interface is derived from these.
	*
	* IMPORTANT: When adding a new callback:
	* 1. Add the constant here
	* 2. Add the callback signature to FacadeCallbackTypes below
	* 3. The BlockStorageFacade type will automatically include it
	*/
	const BlockStorageFacadeCallbacks = {
		StorageApplyUpdate: "__pl_storage_applyUpdate",
		StorageDebugView: "__pl_storage_debugView",
		StorageMigrate: "__pl_storage_migrate",
		ArgsDerive: "__pl_args_derive",
		PrerunArgsDerive: "__pl_prerunArgs_derive",
		StorageInitial: "__pl_storage_initial"
	};
	/**
	* Creates a map of lambda handles from a callbacks constant object.
	* Keys are the callback string values (e.g., '__pl_storage_applyUpdate').
	*/
	function createFacadeHandles(callbacks) {
		return Object.fromEntries(Object.values(callbacks).map((handle) => [handle, createRenderLambda({ handle })]));
	}
	/**
	* Lambda handles for facade callbacks.
	* Used by the middle layer to invoke callbacks via executeSingleLambda().
	*/
	const BlockStorageFacadeHandles = createFacadeHandles(BlockStorageFacadeCallbacks);
	/** Register all facade callbacks at once. Ensures all required callbacks are provided. */
	function registerFacadeCallbacks(callbacks) {
		for (const key of Object.values(BlockStorageFacadeCallbacks)) tryRegisterCallback(key, callbacks[key]);
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/config/actions.js
	function getFromCfg(variable) {
		return {
			type: "GetFromCtx",
			variable
		};
	}
	getFromCfg("$args");
	getFromCfg("$it");
	getFromCfg("$prod");
	getFromCfg("$staging");
	getFromCfg("$ui");
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/render/future.js
	var FutureRef = class FutureRef {
		isResolved = false;
		resolvedValue;
		constructor(handle, postProcess = (v) => v) {
			this.handle = handle;
			this.postProcess = postProcess;
			registerFutureAwait(handle, (value) => {
				this.resolvedValue = postProcess(value);
				this.isResolved = true;
			});
		}
		map(mapping) {
			return new FutureRef(this.handle, (v) => mapping(this.postProcess(v)));
		}
		mapDefined(mapping) {
			return new FutureRef(this.handle, (v) => {
				const vv = this.postProcess(v);
				return vv ? mapping(vv) : void 0;
			});
		}
		toJSON() {
			return this.isResolved ? this.resolvedValue : { __awaited_futures__: [this.handle] };
		}
	};
	//#endregion
	//#region ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
	var util$1;
	(function(util) {
		util.assertEqual = (_) => {};
		function assertIs(_arg) {}
		util.assertIs = assertIs;
		function assertNever(_x) {
			throw new Error();
		}
		util.assertNever = assertNever;
		util.arrayToEnum = (items) => {
			const obj = {};
			for (const item of items) obj[item] = item;
			return obj;
		};
		util.getValidEnumValues = (obj) => {
			const validKeys = util.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
			const filtered = {};
			for (const k of validKeys) filtered[k] = obj[k];
			return util.objectValues(filtered);
		};
		util.objectValues = (obj) => {
			return util.objectKeys(obj).map(function(e) {
				return obj[e];
			});
		};
		util.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
			const keys = [];
			for (const key in object) if (Object.prototype.hasOwnProperty.call(object, key)) keys.push(key);
			return keys;
		};
		util.find = (arr, checker) => {
			for (const item of arr) if (checker(item)) return item;
		};
		util.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
		function joinValues(array, separator = " | ") {
			return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
		}
		util.joinValues = joinValues;
		util.jsonStringifyReplacer = (_, value) => {
			if (typeof value === "bigint") return value.toString();
			return value;
		};
	})(util$1 || (util$1 = {}));
	var objectUtil$1;
	(function(objectUtil) {
		objectUtil.mergeShapes = (first, second) => {
			return {
				...first,
				...second
			};
		};
	})(objectUtil$1 || (objectUtil$1 = {}));
	const ZodParsedType$1 = util$1.arrayToEnum([
		"string",
		"nan",
		"number",
		"integer",
		"float",
		"boolean",
		"date",
		"bigint",
		"symbol",
		"function",
		"undefined",
		"null",
		"array",
		"object",
		"unknown",
		"promise",
		"void",
		"never",
		"map",
		"set"
	]);
	const getParsedType$1 = (data) => {
		switch (typeof data) {
			case "undefined": return ZodParsedType$1.undefined;
			case "string": return ZodParsedType$1.string;
			case "number": return Number.isNaN(data) ? ZodParsedType$1.nan : ZodParsedType$1.number;
			case "boolean": return ZodParsedType$1.boolean;
			case "function": return ZodParsedType$1.function;
			case "bigint": return ZodParsedType$1.bigint;
			case "symbol": return ZodParsedType$1.symbol;
			case "object":
				if (Array.isArray(data)) return ZodParsedType$1.array;
				if (data === null) return ZodParsedType$1.null;
				if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") return ZodParsedType$1.promise;
				if (typeof Map !== "undefined" && data instanceof Map) return ZodParsedType$1.map;
				if (typeof Set !== "undefined" && data instanceof Set) return ZodParsedType$1.set;
				if (typeof Date !== "undefined" && data instanceof Date) return ZodParsedType$1.date;
				return ZodParsedType$1.object;
			default: return ZodParsedType$1.unknown;
		}
	};
	//#endregion
	//#region ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
	const ZodIssueCode$1 = util$1.arrayToEnum([
		"invalid_type",
		"invalid_literal",
		"custom",
		"invalid_union",
		"invalid_union_discriminator",
		"invalid_enum_value",
		"unrecognized_keys",
		"invalid_arguments",
		"invalid_return_type",
		"invalid_date",
		"invalid_string",
		"too_small",
		"too_big",
		"invalid_intersection_types",
		"not_multiple_of",
		"not_finite"
	]);
	var ZodError$1 = class ZodError$1 extends Error {
		get errors() {
			return this.issues;
		}
		constructor(issues) {
			super();
			this.issues = [];
			this.addIssue = (sub) => {
				this.issues = [...this.issues, sub];
			};
			this.addIssues = (subs = []) => {
				this.issues = [...this.issues, ...subs];
			};
			const actualProto = new.target.prototype;
			if (Object.setPrototypeOf) Object.setPrototypeOf(this, actualProto);
			else this.__proto__ = actualProto;
			this.name = "ZodError";
			this.issues = issues;
		}
		format(_mapper) {
			const mapper = _mapper || function(issue) {
				return issue.message;
			};
			const fieldErrors = { _errors: [] };
			const processError = (error) => {
				for (const issue of error.issues) if (issue.code === "invalid_union") issue.unionErrors.map(processError);
				else if (issue.code === "invalid_return_type") processError(issue.returnTypeError);
				else if (issue.code === "invalid_arguments") processError(issue.argumentsError);
				else if (issue.path.length === 0) fieldErrors._errors.push(mapper(issue));
				else {
					let curr = fieldErrors;
					let i = 0;
					while (i < issue.path.length) {
						const el = issue.path[i];
						if (!(i === issue.path.length - 1)) curr[el] = curr[el] || { _errors: [] };
						else {
							curr[el] = curr[el] || { _errors: [] };
							curr[el]._errors.push(mapper(issue));
						}
						curr = curr[el];
						i++;
					}
				}
			};
			processError(this);
			return fieldErrors;
		}
		static assert(value) {
			if (!(value instanceof ZodError$1)) throw new Error(`Not a ZodError: ${value}`);
		}
		toString() {
			return this.message;
		}
		get message() {
			return JSON.stringify(this.issues, util$1.jsonStringifyReplacer, 2);
		}
		get isEmpty() {
			return this.issues.length === 0;
		}
		flatten(mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of this.issues) if (sub.path.length > 0) {
				const firstEl = sub.path[0];
				fieldErrors[firstEl] = fieldErrors[firstEl] || [];
				fieldErrors[firstEl].push(mapper(sub));
			} else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		get formErrors() {
			return this.flatten();
		}
	};
	ZodError$1.create = (issues) => {
		return new ZodError$1(issues);
	};
	//#endregion
	//#region ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
	const errorMap$1 = (issue, _ctx) => {
		let message;
		switch (issue.code) {
			case ZodIssueCode$1.invalid_type:
				if (issue.received === ZodParsedType$1.undefined) message = "Required";
				else message = `Expected ${issue.expected}, received ${issue.received}`;
				break;
			case ZodIssueCode$1.invalid_literal:
				message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util$1.jsonStringifyReplacer)}`;
				break;
			case ZodIssueCode$1.unrecognized_keys:
				message = `Unrecognized key(s) in object: ${util$1.joinValues(issue.keys, ", ")}`;
				break;
			case ZodIssueCode$1.invalid_union:
				message = `Invalid input`;
				break;
			case ZodIssueCode$1.invalid_union_discriminator:
				message = `Invalid discriminator value. Expected ${util$1.joinValues(issue.options)}`;
				break;
			case ZodIssueCode$1.invalid_enum_value:
				message = `Invalid enum value. Expected ${util$1.joinValues(issue.options)}, received '${issue.received}'`;
				break;
			case ZodIssueCode$1.invalid_arguments:
				message = `Invalid function arguments`;
				break;
			case ZodIssueCode$1.invalid_return_type:
				message = `Invalid function return type`;
				break;
			case ZodIssueCode$1.invalid_date:
				message = `Invalid date`;
				break;
			case ZodIssueCode$1.invalid_string:
				if (typeof issue.validation === "object") if ("includes" in issue.validation) {
					message = `Invalid input: must include "${issue.validation.includes}"`;
					if (typeof issue.validation.position === "number") message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
				} else if ("startsWith" in issue.validation) message = `Invalid input: must start with "${issue.validation.startsWith}"`;
				else if ("endsWith" in issue.validation) message = `Invalid input: must end with "${issue.validation.endsWith}"`;
				else util$1.assertNever(issue.validation);
				else if (issue.validation !== "regex") message = `Invalid ${issue.validation}`;
				else message = "Invalid";
				break;
			case ZodIssueCode$1.too_small:
				if (issue.type === "array") message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
				else if (issue.type === "string") message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
				else if (issue.type === "number") message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
				else if (issue.type === "bigint") message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
				else if (issue.type === "date") message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
				else message = "Invalid input";
				break;
			case ZodIssueCode$1.too_big:
				if (issue.type === "array") message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
				else if (issue.type === "string") message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
				else if (issue.type === "number") message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
				else if (issue.type === "bigint") message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
				else if (issue.type === "date") message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
				else message = "Invalid input";
				break;
			case ZodIssueCode$1.custom:
				message = `Invalid input`;
				break;
			case ZodIssueCode$1.invalid_intersection_types:
				message = `Intersection results could not be merged`;
				break;
			case ZodIssueCode$1.not_multiple_of:
				message = `Number must be a multiple of ${issue.multipleOf}`;
				break;
			case ZodIssueCode$1.not_finite:
				message = "Number must be finite";
				break;
			default:
				message = _ctx.defaultError;
				util$1.assertNever(issue);
		}
		return { message };
	};
	//#endregion
	//#region ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
	let overrideErrorMap$1 = errorMap$1;
	function getErrorMap$1() {
		return overrideErrorMap$1;
	}
	//#endregion
	//#region ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
	const makeIssue$1 = (params) => {
		const { data, path, errorMaps, issueData } = params;
		const fullPath = [...path, ...issueData.path || []];
		const fullIssue = {
			...issueData,
			path: fullPath
		};
		if (issueData.message !== void 0) return {
			...issueData,
			path: fullPath,
			message: issueData.message
		};
		let errorMessage = "";
		const maps = errorMaps.filter((m) => !!m).slice().reverse();
		for (const map of maps) errorMessage = map(fullIssue, {
			data,
			defaultError: errorMessage
		}).message;
		return {
			...issueData,
			path: fullPath,
			message: errorMessage
		};
	};
	function addIssueToContext$1(ctx, issueData) {
		const overrideMap = getErrorMap$1();
		const issue = makeIssue$1({
			issueData,
			data: ctx.data,
			path: ctx.path,
			errorMaps: [
				ctx.common.contextualErrorMap,
				ctx.schemaErrorMap,
				overrideMap,
				overrideMap === errorMap$1 ? void 0 : errorMap$1
			].filter((x) => !!x)
		});
		ctx.common.issues.push(issue);
	}
	var ParseStatus$1 = class ParseStatus$1 {
		constructor() {
			this.value = "valid";
		}
		dirty() {
			if (this.value === "valid") this.value = "dirty";
		}
		abort() {
			if (this.value !== "aborted") this.value = "aborted";
		}
		static mergeArray(status, results) {
			const arrayValue = [];
			for (const s of results) {
				if (s.status === "aborted") return INVALID$1;
				if (s.status === "dirty") status.dirty();
				arrayValue.push(s.value);
			}
			return {
				status: status.value,
				value: arrayValue
			};
		}
		static async mergeObjectAsync(status, pairs) {
			const syncPairs = [];
			for (const pair of pairs) {
				const key = await pair.key;
				const value = await pair.value;
				syncPairs.push({
					key,
					value
				});
			}
			return ParseStatus$1.mergeObjectSync(status, syncPairs);
		}
		static mergeObjectSync(status, pairs) {
			const finalObject = {};
			for (const pair of pairs) {
				const { key, value } = pair;
				if (key.status === "aborted") return INVALID$1;
				if (value.status === "aborted") return INVALID$1;
				if (key.status === "dirty") status.dirty();
				if (value.status === "dirty") status.dirty();
				if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) finalObject[key.value] = value.value;
			}
			return {
				status: status.value,
				value: finalObject
			};
		}
	};
	const INVALID$1 = Object.freeze({ status: "aborted" });
	const DIRTY$1 = (value) => ({
		status: "dirty",
		value
	});
	const OK$1 = (value) => ({
		status: "valid",
		value
	});
	const isAborted$1 = (x) => x.status === "aborted";
	const isDirty$1 = (x) => x.status === "dirty";
	const isValid$1 = (x) => x.status === "valid";
	const isAsync$1 = (x) => typeof Promise !== "undefined" && x instanceof Promise;
	//#endregion
	//#region ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
	var errorUtil$1;
	(function(errorUtil) {
		errorUtil.errToObj = (message) => typeof message === "string" ? { message } : message || {};
		errorUtil.toString = (message) => typeof message === "string" ? message : message?.message;
	})(errorUtil$1 || (errorUtil$1 = {}));
	//#endregion
	//#region ../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
	var ParseInputLazyPath$1 = class {
		constructor(parent, value, path, key) {
			this._cachedPath = [];
			this.parent = parent;
			this.data = value;
			this._path = path;
			this._key = key;
		}
		get path() {
			if (!this._cachedPath.length) if (Array.isArray(this._key)) this._cachedPath.push(...this._path, ...this._key);
			else this._cachedPath.push(...this._path, this._key);
			return this._cachedPath;
		}
	};
	const handleResult$1 = (ctx, result) => {
		if (isValid$1(result)) return {
			success: true,
			data: result.value
		};
		else {
			if (!ctx.common.issues.length) throw new Error("Validation failed but no issues detected.");
			return {
				success: false,
				get error() {
					if (this._error) return this._error;
					const error = new ZodError$1(ctx.common.issues);
					this._error = error;
					return this._error;
				}
			};
		}
	};
	function processCreateParams$1(params) {
		if (!params) return {};
		const { errorMap, invalid_type_error, required_error, description } = params;
		if (errorMap && (invalid_type_error || required_error)) throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
		if (errorMap) return {
			errorMap,
			description
		};
		const customMap = (iss, ctx) => {
			const { message } = params;
			if (iss.code === "invalid_enum_value") return { message: message ?? ctx.defaultError };
			if (typeof ctx.data === "undefined") return { message: message ?? required_error ?? ctx.defaultError };
			if (iss.code !== "invalid_type") return { message: ctx.defaultError };
			return { message: message ?? invalid_type_error ?? ctx.defaultError };
		};
		return {
			errorMap: customMap,
			description
		};
	}
	var ZodType$1 = class {
		get description() {
			return this._def.description;
		}
		_getType(input) {
			return getParsedType$1(input.data);
		}
		_getOrReturnCtx(input, ctx) {
			return ctx || {
				common: input.parent.common,
				data: input.data,
				parsedType: getParsedType$1(input.data),
				schemaErrorMap: this._def.errorMap,
				path: input.path,
				parent: input.parent
			};
		}
		_processInputParams(input) {
			return {
				status: new ParseStatus$1(),
				ctx: {
					common: input.parent.common,
					data: input.data,
					parsedType: getParsedType$1(input.data),
					schemaErrorMap: this._def.errorMap,
					path: input.path,
					parent: input.parent
				}
			};
		}
		_parseSync(input) {
			const result = this._parse(input);
			if (isAsync$1(result)) throw new Error("Synchronous parse encountered promise.");
			return result;
		}
		_parseAsync(input) {
			const result = this._parse(input);
			return Promise.resolve(result);
		}
		parse(data, params) {
			const result = this.safeParse(data, params);
			if (result.success) return result.data;
			throw result.error;
		}
		safeParse(data, params) {
			const ctx = {
				common: {
					issues: [],
					async: params?.async ?? false,
					contextualErrorMap: params?.errorMap
				},
				path: params?.path || [],
				schemaErrorMap: this._def.errorMap,
				parent: null,
				data,
				parsedType: getParsedType$1(data)
			};
			return handleResult$1(ctx, this._parseSync({
				data,
				path: ctx.path,
				parent: ctx
			}));
		}
		"~validate"(data) {
			const ctx = {
				common: {
					issues: [],
					async: !!this["~standard"].async
				},
				path: [],
				schemaErrorMap: this._def.errorMap,
				parent: null,
				data,
				parsedType: getParsedType$1(data)
			};
			if (!this["~standard"].async) try {
				const result = this._parseSync({
					data,
					path: [],
					parent: ctx
				});
				return isValid$1(result) ? { value: result.value } : { issues: ctx.common.issues };
			} catch (err) {
				if (err?.message?.toLowerCase()?.includes("encountered")) this["~standard"].async = true;
				ctx.common = {
					issues: [],
					async: true
				};
			}
			return this._parseAsync({
				data,
				path: [],
				parent: ctx
			}).then((result) => isValid$1(result) ? { value: result.value } : { issues: ctx.common.issues });
		}
		async parseAsync(data, params) {
			const result = await this.safeParseAsync(data, params);
			if (result.success) return result.data;
			throw result.error;
		}
		async safeParseAsync(data, params) {
			const ctx = {
				common: {
					issues: [],
					contextualErrorMap: params?.errorMap,
					async: true
				},
				path: params?.path || [],
				schemaErrorMap: this._def.errorMap,
				parent: null,
				data,
				parsedType: getParsedType$1(data)
			};
			const maybeAsyncResult = this._parse({
				data,
				path: ctx.path,
				parent: ctx
			});
			return handleResult$1(ctx, await (isAsync$1(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult)));
		}
		refine(check, message) {
			const getIssueProperties = (val) => {
				if (typeof message === "string" || typeof message === "undefined") return { message };
				else if (typeof message === "function") return message(val);
				else return message;
			};
			return this._refinement((val, ctx) => {
				const result = check(val);
				const setError = () => ctx.addIssue({
					code: ZodIssueCode$1.custom,
					...getIssueProperties(val)
				});
				if (typeof Promise !== "undefined" && result instanceof Promise) return result.then((data) => {
					if (!data) {
						setError();
						return false;
					} else return true;
				});
				if (!result) {
					setError();
					return false;
				} else return true;
			});
		}
		refinement(check, refinementData) {
			return this._refinement((val, ctx) => {
				if (!check(val)) {
					ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
					return false;
				} else return true;
			});
		}
		_refinement(refinement) {
			return new ZodEffects$1({
				schema: this,
				typeName: ZodFirstPartyTypeKind$1.ZodEffects,
				effect: {
					type: "refinement",
					refinement
				}
			});
		}
		superRefine(refinement) {
			return this._refinement(refinement);
		}
		constructor(def) {
			/** Alias of safeParseAsync */
			this.spa = this.safeParseAsync;
			this._def = def;
			this.parse = this.parse.bind(this);
			this.safeParse = this.safeParse.bind(this);
			this.parseAsync = this.parseAsync.bind(this);
			this.safeParseAsync = this.safeParseAsync.bind(this);
			this.spa = this.spa.bind(this);
			this.refine = this.refine.bind(this);
			this.refinement = this.refinement.bind(this);
			this.superRefine = this.superRefine.bind(this);
			this.optional = this.optional.bind(this);
			this.nullable = this.nullable.bind(this);
			this.nullish = this.nullish.bind(this);
			this.array = this.array.bind(this);
			this.promise = this.promise.bind(this);
			this.or = this.or.bind(this);
			this.and = this.and.bind(this);
			this.transform = this.transform.bind(this);
			this.brand = this.brand.bind(this);
			this.default = this.default.bind(this);
			this.catch = this.catch.bind(this);
			this.describe = this.describe.bind(this);
			this.pipe = this.pipe.bind(this);
			this.readonly = this.readonly.bind(this);
			this.isNullable = this.isNullable.bind(this);
			this.isOptional = this.isOptional.bind(this);
			this["~standard"] = {
				version: 1,
				vendor: "zod",
				validate: (data) => this["~validate"](data)
			};
		}
		optional() {
			return ZodOptional$1.create(this, this._def);
		}
		nullable() {
			return ZodNullable$1.create(this, this._def);
		}
		nullish() {
			return this.nullable().optional();
		}
		array() {
			return ZodArray$1.create(this);
		}
		promise() {
			return ZodPromise$1.create(this, this._def);
		}
		or(option) {
			return ZodUnion$1.create([this, option], this._def);
		}
		and(incoming) {
			return ZodIntersection$1.create(this, incoming, this._def);
		}
		transform(transform) {
			return new ZodEffects$1({
				...processCreateParams$1(this._def),
				schema: this,
				typeName: ZodFirstPartyTypeKind$1.ZodEffects,
				effect: {
					type: "transform",
					transform
				}
			});
		}
		default(def) {
			const defaultValueFunc = typeof def === "function" ? def : () => def;
			return new ZodDefault$1({
				...processCreateParams$1(this._def),
				innerType: this,
				defaultValue: defaultValueFunc,
				typeName: ZodFirstPartyTypeKind$1.ZodDefault
			});
		}
		brand() {
			return new ZodBranded$1({
				typeName: ZodFirstPartyTypeKind$1.ZodBranded,
				type: this,
				...processCreateParams$1(this._def)
			});
		}
		catch(def) {
			const catchValueFunc = typeof def === "function" ? def : () => def;
			return new ZodCatch$1({
				...processCreateParams$1(this._def),
				innerType: this,
				catchValue: catchValueFunc,
				typeName: ZodFirstPartyTypeKind$1.ZodCatch
			});
		}
		describe(description) {
			const This = this.constructor;
			return new This({
				...this._def,
				description
			});
		}
		pipe(target) {
			return ZodPipeline$1.create(this, target);
		}
		readonly() {
			return ZodReadonly$1.create(this);
		}
		isOptional() {
			return this.safeParse(void 0).success;
		}
		isNullable() {
			return this.safeParse(null).success;
		}
	};
	const cuidRegex$1 = /^c[^\s-]{8,}$/i;
	const cuid2Regex$1 = /^[0-9a-z]+$/;
	const ulidRegex$1 = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
	const uuidRegex$1 = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
	const nanoidRegex$1 = /^[a-z0-9_-]{21}$/i;
	const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
	const durationRegex$1 = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
	const emailRegex$1 = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
	const _emojiRegex$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
	let emojiRegex$1;
	const ipv4Regex$1 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
	const ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
	const ipv6Regex$1 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
	const ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
	const base64Regex$1 = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
	const base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
	const dateRegexSource$1 = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
	const dateRegex$1 = new RegExp(`^${dateRegexSource$1}$`);
	function timeRegexSource$1(args) {
		let secondsRegexSource = `[0-5]\\d`;
		if (args.precision) secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
		else if (args.precision == null) secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
		const secondsQuantifier = args.precision ? "+" : "?";
		return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
	}
	function timeRegex$1(args) {
		return new RegExp(`^${timeRegexSource$1(args)}$`);
	}
	function datetimeRegex$1(args) {
		let regex = `${dateRegexSource$1}T${timeRegexSource$1(args)}`;
		const opts = [];
		opts.push(args.local ? `Z?` : `Z`);
		if (args.offset) opts.push(`([+-]\\d{2}:?\\d{2})`);
		regex = `${regex}(${opts.join("|")})`;
		return new RegExp(`^${regex}$`);
	}
	function isValidIP$1(ip, version) {
		if ((version === "v4" || !version) && ipv4Regex$1.test(ip)) return true;
		if ((version === "v6" || !version) && ipv6Regex$1.test(ip)) return true;
		return false;
	}
	function isValidJWT(jwt, alg) {
		if (!jwtRegex.test(jwt)) return false;
		try {
			const [header] = jwt.split(".");
			if (!header) return false;
			const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
			const decoded = JSON.parse(atob(base64));
			if (typeof decoded !== "object" || decoded === null) return false;
			if ("typ" in decoded && decoded?.typ !== "JWT") return false;
			if (!decoded.alg) return false;
			if (alg && decoded.alg !== alg) return false;
			return true;
		} catch {
			return false;
		}
	}
	function isValidCidr(ip, version) {
		if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) return true;
		if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) return true;
		return false;
	}
	var ZodString$1 = class ZodString$1 extends ZodType$1 {
		_parse(input) {
			if (this._def.coerce) input.data = String(input.data);
			if (this._getType(input) !== ZodParsedType$1.string) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.string,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			const status = new ParseStatus$1();
			let ctx = void 0;
			for (const check of this._def.checks) if (check.kind === "min") {
				if (input.data.length < check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_small,
						minimum: check.value,
						type: "string",
						inclusive: true,
						exact: false,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "max") {
				if (input.data.length > check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_big,
						maximum: check.value,
						type: "string",
						inclusive: true,
						exact: false,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "length") {
				const tooBig = input.data.length > check.value;
				const tooSmall = input.data.length < check.value;
				if (tooBig || tooSmall) {
					ctx = this._getOrReturnCtx(input, ctx);
					if (tooBig) addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_big,
						maximum: check.value,
						type: "string",
						inclusive: true,
						exact: true,
						message: check.message
					});
					else if (tooSmall) addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_small,
						minimum: check.value,
						type: "string",
						inclusive: true,
						exact: true,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "email") {
				if (!emailRegex$1.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "email",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "emoji") {
				if (!emojiRegex$1) emojiRegex$1 = new RegExp(_emojiRegex$1, "u");
				if (!emojiRegex$1.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "emoji",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "uuid") {
				if (!uuidRegex$1.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "uuid",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "nanoid") {
				if (!nanoidRegex$1.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "nanoid",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "cuid") {
				if (!cuidRegex$1.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "cuid",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "cuid2") {
				if (!cuid2Regex$1.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "cuid2",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "ulid") {
				if (!ulidRegex$1.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "ulid",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "url") try {
				new URL(input.data);
			} catch {
				ctx = this._getOrReturnCtx(input, ctx);
				addIssueToContext$1(ctx, {
					validation: "url",
					code: ZodIssueCode$1.invalid_string,
					message: check.message
				});
				status.dirty();
			}
			else if (check.kind === "regex") {
				check.regex.lastIndex = 0;
				if (!check.regex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "regex",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "trim") input.data = input.data.trim();
			else if (check.kind === "includes") {
				if (!input.data.includes(check.value, check.position)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.invalid_string,
						validation: {
							includes: check.value,
							position: check.position
						},
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "toLowerCase") input.data = input.data.toLowerCase();
			else if (check.kind === "toUpperCase") input.data = input.data.toUpperCase();
			else if (check.kind === "startsWith") {
				if (!input.data.startsWith(check.value)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.invalid_string,
						validation: { startsWith: check.value },
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "endsWith") {
				if (!input.data.endsWith(check.value)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.invalid_string,
						validation: { endsWith: check.value },
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "datetime") {
				if (!datetimeRegex$1(check).test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.invalid_string,
						validation: "datetime",
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "date") {
				if (!dateRegex$1.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.invalid_string,
						validation: "date",
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "time") {
				if (!timeRegex$1(check).test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.invalid_string,
						validation: "time",
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "duration") {
				if (!durationRegex$1.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "duration",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "ip") {
				if (!isValidIP$1(input.data, check.version)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "ip",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "jwt") {
				if (!isValidJWT(input.data, check.alg)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "jwt",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "cidr") {
				if (!isValidCidr(input.data, check.version)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "cidr",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "base64") {
				if (!base64Regex$1.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "base64",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "base64url") {
				if (!base64urlRegex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						validation: "base64url",
						code: ZodIssueCode$1.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else util$1.assertNever(check);
			return {
				status: status.value,
				value: input.data
			};
		}
		_regex(regex, validation, message) {
			return this.refinement((data) => regex.test(data), {
				validation,
				code: ZodIssueCode$1.invalid_string,
				...errorUtil$1.errToObj(message)
			});
		}
		_addCheck(check) {
			return new ZodString$1({
				...this._def,
				checks: [...this._def.checks, check]
			});
		}
		email(message) {
			return this._addCheck({
				kind: "email",
				...errorUtil$1.errToObj(message)
			});
		}
		url(message) {
			return this._addCheck({
				kind: "url",
				...errorUtil$1.errToObj(message)
			});
		}
		emoji(message) {
			return this._addCheck({
				kind: "emoji",
				...errorUtil$1.errToObj(message)
			});
		}
		uuid(message) {
			return this._addCheck({
				kind: "uuid",
				...errorUtil$1.errToObj(message)
			});
		}
		nanoid(message) {
			return this._addCheck({
				kind: "nanoid",
				...errorUtil$1.errToObj(message)
			});
		}
		cuid(message) {
			return this._addCheck({
				kind: "cuid",
				...errorUtil$1.errToObj(message)
			});
		}
		cuid2(message) {
			return this._addCheck({
				kind: "cuid2",
				...errorUtil$1.errToObj(message)
			});
		}
		ulid(message) {
			return this._addCheck({
				kind: "ulid",
				...errorUtil$1.errToObj(message)
			});
		}
		base64(message) {
			return this._addCheck({
				kind: "base64",
				...errorUtil$1.errToObj(message)
			});
		}
		base64url(message) {
			return this._addCheck({
				kind: "base64url",
				...errorUtil$1.errToObj(message)
			});
		}
		jwt(options) {
			return this._addCheck({
				kind: "jwt",
				...errorUtil$1.errToObj(options)
			});
		}
		ip(options) {
			return this._addCheck({
				kind: "ip",
				...errorUtil$1.errToObj(options)
			});
		}
		cidr(options) {
			return this._addCheck({
				kind: "cidr",
				...errorUtil$1.errToObj(options)
			});
		}
		datetime(options) {
			if (typeof options === "string") return this._addCheck({
				kind: "datetime",
				precision: null,
				offset: false,
				local: false,
				message: options
			});
			return this._addCheck({
				kind: "datetime",
				precision: typeof options?.precision === "undefined" ? null : options?.precision,
				offset: options?.offset ?? false,
				local: options?.local ?? false,
				...errorUtil$1.errToObj(options?.message)
			});
		}
		date(message) {
			return this._addCheck({
				kind: "date",
				message
			});
		}
		time(options) {
			if (typeof options === "string") return this._addCheck({
				kind: "time",
				precision: null,
				message: options
			});
			return this._addCheck({
				kind: "time",
				precision: typeof options?.precision === "undefined" ? null : options?.precision,
				...errorUtil$1.errToObj(options?.message)
			});
		}
		duration(message) {
			return this._addCheck({
				kind: "duration",
				...errorUtil$1.errToObj(message)
			});
		}
		regex(regex, message) {
			return this._addCheck({
				kind: "regex",
				regex,
				...errorUtil$1.errToObj(message)
			});
		}
		includes(value, options) {
			return this._addCheck({
				kind: "includes",
				value,
				position: options?.position,
				...errorUtil$1.errToObj(options?.message)
			});
		}
		startsWith(value, message) {
			return this._addCheck({
				kind: "startsWith",
				value,
				...errorUtil$1.errToObj(message)
			});
		}
		endsWith(value, message) {
			return this._addCheck({
				kind: "endsWith",
				value,
				...errorUtil$1.errToObj(message)
			});
		}
		min(minLength, message) {
			return this._addCheck({
				kind: "min",
				value: minLength,
				...errorUtil$1.errToObj(message)
			});
		}
		max(maxLength, message) {
			return this._addCheck({
				kind: "max",
				value: maxLength,
				...errorUtil$1.errToObj(message)
			});
		}
		length(len, message) {
			return this._addCheck({
				kind: "length",
				value: len,
				...errorUtil$1.errToObj(message)
			});
		}
		/**
		* Equivalent to `.min(1)`
		*/
		nonempty(message) {
			return this.min(1, errorUtil$1.errToObj(message));
		}
		trim() {
			return new ZodString$1({
				...this._def,
				checks: [...this._def.checks, { kind: "trim" }]
			});
		}
		toLowerCase() {
			return new ZodString$1({
				...this._def,
				checks: [...this._def.checks, { kind: "toLowerCase" }]
			});
		}
		toUpperCase() {
			return new ZodString$1({
				...this._def,
				checks: [...this._def.checks, { kind: "toUpperCase" }]
			});
		}
		get isDatetime() {
			return !!this._def.checks.find((ch) => ch.kind === "datetime");
		}
		get isDate() {
			return !!this._def.checks.find((ch) => ch.kind === "date");
		}
		get isTime() {
			return !!this._def.checks.find((ch) => ch.kind === "time");
		}
		get isDuration() {
			return !!this._def.checks.find((ch) => ch.kind === "duration");
		}
		get isEmail() {
			return !!this._def.checks.find((ch) => ch.kind === "email");
		}
		get isURL() {
			return !!this._def.checks.find((ch) => ch.kind === "url");
		}
		get isEmoji() {
			return !!this._def.checks.find((ch) => ch.kind === "emoji");
		}
		get isUUID() {
			return !!this._def.checks.find((ch) => ch.kind === "uuid");
		}
		get isNANOID() {
			return !!this._def.checks.find((ch) => ch.kind === "nanoid");
		}
		get isCUID() {
			return !!this._def.checks.find((ch) => ch.kind === "cuid");
		}
		get isCUID2() {
			return !!this._def.checks.find((ch) => ch.kind === "cuid2");
		}
		get isULID() {
			return !!this._def.checks.find((ch) => ch.kind === "ulid");
		}
		get isIP() {
			return !!this._def.checks.find((ch) => ch.kind === "ip");
		}
		get isCIDR() {
			return !!this._def.checks.find((ch) => ch.kind === "cidr");
		}
		get isBase64() {
			return !!this._def.checks.find((ch) => ch.kind === "base64");
		}
		get isBase64url() {
			return !!this._def.checks.find((ch) => ch.kind === "base64url");
		}
		get minLength() {
			let min = null;
			for (const ch of this._def.checks) if (ch.kind === "min") {
				if (min === null || ch.value > min) min = ch.value;
			}
			return min;
		}
		get maxLength() {
			let max = null;
			for (const ch of this._def.checks) if (ch.kind === "max") {
				if (max === null || ch.value < max) max = ch.value;
			}
			return max;
		}
	};
	ZodString$1.create = (params) => {
		return new ZodString$1({
			checks: [],
			typeName: ZodFirstPartyTypeKind$1.ZodString,
			coerce: params?.coerce ?? false,
			...processCreateParams$1(params)
		});
	};
	function floatSafeRemainder$1(val, step) {
		const valDecCount = (val.toString().split(".")[1] || "").length;
		const stepDecCount = (step.toString().split(".")[1] || "").length;
		const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
		return Number.parseInt(val.toFixed(decCount).replace(".", "")) % Number.parseInt(step.toFixed(decCount).replace(".", "")) / 10 ** decCount;
	}
	var ZodNumber$1 = class ZodNumber$1 extends ZodType$1 {
		constructor() {
			super(...arguments);
			this.min = this.gte;
			this.max = this.lte;
			this.step = this.multipleOf;
		}
		_parse(input) {
			if (this._def.coerce) input.data = Number(input.data);
			if (this._getType(input) !== ZodParsedType$1.number) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.number,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			let ctx = void 0;
			const status = new ParseStatus$1();
			for (const check of this._def.checks) if (check.kind === "int") {
				if (!util$1.isInteger(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.invalid_type,
						expected: "integer",
						received: "float",
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "min") {
				if (check.inclusive ? input.data < check.value : input.data <= check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_small,
						minimum: check.value,
						type: "number",
						inclusive: check.inclusive,
						exact: false,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "max") {
				if (check.inclusive ? input.data > check.value : input.data >= check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_big,
						maximum: check.value,
						type: "number",
						inclusive: check.inclusive,
						exact: false,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "multipleOf") {
				if (floatSafeRemainder$1(input.data, check.value) !== 0) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.not_multiple_of,
						multipleOf: check.value,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "finite") {
				if (!Number.isFinite(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.not_finite,
						message: check.message
					});
					status.dirty();
				}
			} else util$1.assertNever(check);
			return {
				status: status.value,
				value: input.data
			};
		}
		gte(value, message) {
			return this.setLimit("min", value, true, errorUtil$1.toString(message));
		}
		gt(value, message) {
			return this.setLimit("min", value, false, errorUtil$1.toString(message));
		}
		lte(value, message) {
			return this.setLimit("max", value, true, errorUtil$1.toString(message));
		}
		lt(value, message) {
			return this.setLimit("max", value, false, errorUtil$1.toString(message));
		}
		setLimit(kind, value, inclusive, message) {
			return new ZodNumber$1({
				...this._def,
				checks: [...this._def.checks, {
					kind,
					value,
					inclusive,
					message: errorUtil$1.toString(message)
				}]
			});
		}
		_addCheck(check) {
			return new ZodNumber$1({
				...this._def,
				checks: [...this._def.checks, check]
			});
		}
		int(message) {
			return this._addCheck({
				kind: "int",
				message: errorUtil$1.toString(message)
			});
		}
		positive(message) {
			return this._addCheck({
				kind: "min",
				value: 0,
				inclusive: false,
				message: errorUtil$1.toString(message)
			});
		}
		negative(message) {
			return this._addCheck({
				kind: "max",
				value: 0,
				inclusive: false,
				message: errorUtil$1.toString(message)
			});
		}
		nonpositive(message) {
			return this._addCheck({
				kind: "max",
				value: 0,
				inclusive: true,
				message: errorUtil$1.toString(message)
			});
		}
		nonnegative(message) {
			return this._addCheck({
				kind: "min",
				value: 0,
				inclusive: true,
				message: errorUtil$1.toString(message)
			});
		}
		multipleOf(value, message) {
			return this._addCheck({
				kind: "multipleOf",
				value,
				message: errorUtil$1.toString(message)
			});
		}
		finite(message) {
			return this._addCheck({
				kind: "finite",
				message: errorUtil$1.toString(message)
			});
		}
		safe(message) {
			return this._addCheck({
				kind: "min",
				inclusive: true,
				value: Number.MIN_SAFE_INTEGER,
				message: errorUtil$1.toString(message)
			})._addCheck({
				kind: "max",
				inclusive: true,
				value: Number.MAX_SAFE_INTEGER,
				message: errorUtil$1.toString(message)
			});
		}
		get minValue() {
			let min = null;
			for (const ch of this._def.checks) if (ch.kind === "min") {
				if (min === null || ch.value > min) min = ch.value;
			}
			return min;
		}
		get maxValue() {
			let max = null;
			for (const ch of this._def.checks) if (ch.kind === "max") {
				if (max === null || ch.value < max) max = ch.value;
			}
			return max;
		}
		get isInt() {
			return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util$1.isInteger(ch.value));
		}
		get isFinite() {
			let max = null;
			let min = null;
			for (const ch of this._def.checks) if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") return true;
			else if (ch.kind === "min") {
				if (min === null || ch.value > min) min = ch.value;
			} else if (ch.kind === "max") {
				if (max === null || ch.value < max) max = ch.value;
			}
			return Number.isFinite(min) && Number.isFinite(max);
		}
	};
	ZodNumber$1.create = (params) => {
		return new ZodNumber$1({
			checks: [],
			typeName: ZodFirstPartyTypeKind$1.ZodNumber,
			coerce: params?.coerce || false,
			...processCreateParams$1(params)
		});
	};
	var ZodBigInt$1 = class ZodBigInt$1 extends ZodType$1 {
		constructor() {
			super(...arguments);
			this.min = this.gte;
			this.max = this.lte;
		}
		_parse(input) {
			if (this._def.coerce) try {
				input.data = BigInt(input.data);
			} catch {
				return this._getInvalidInput(input);
			}
			if (this._getType(input) !== ZodParsedType$1.bigint) return this._getInvalidInput(input);
			let ctx = void 0;
			const status = new ParseStatus$1();
			for (const check of this._def.checks) if (check.kind === "min") {
				if (check.inclusive ? input.data < check.value : input.data <= check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_small,
						type: "bigint",
						minimum: check.value,
						inclusive: check.inclusive,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "max") {
				if (check.inclusive ? input.data > check.value : input.data >= check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_big,
						type: "bigint",
						maximum: check.value,
						inclusive: check.inclusive,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "multipleOf") {
				if (input.data % check.value !== BigInt(0)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.not_multiple_of,
						multipleOf: check.value,
						message: check.message
					});
					status.dirty();
				}
			} else util$1.assertNever(check);
			return {
				status: status.value,
				value: input.data
			};
		}
		_getInvalidInput(input) {
			const ctx = this._getOrReturnCtx(input);
			addIssueToContext$1(ctx, {
				code: ZodIssueCode$1.invalid_type,
				expected: ZodParsedType$1.bigint,
				received: ctx.parsedType
			});
			return INVALID$1;
		}
		gte(value, message) {
			return this.setLimit("min", value, true, errorUtil$1.toString(message));
		}
		gt(value, message) {
			return this.setLimit("min", value, false, errorUtil$1.toString(message));
		}
		lte(value, message) {
			return this.setLimit("max", value, true, errorUtil$1.toString(message));
		}
		lt(value, message) {
			return this.setLimit("max", value, false, errorUtil$1.toString(message));
		}
		setLimit(kind, value, inclusive, message) {
			return new ZodBigInt$1({
				...this._def,
				checks: [...this._def.checks, {
					kind,
					value,
					inclusive,
					message: errorUtil$1.toString(message)
				}]
			});
		}
		_addCheck(check) {
			return new ZodBigInt$1({
				...this._def,
				checks: [...this._def.checks, check]
			});
		}
		positive(message) {
			return this._addCheck({
				kind: "min",
				value: BigInt(0),
				inclusive: false,
				message: errorUtil$1.toString(message)
			});
		}
		negative(message) {
			return this._addCheck({
				kind: "max",
				value: BigInt(0),
				inclusive: false,
				message: errorUtil$1.toString(message)
			});
		}
		nonpositive(message) {
			return this._addCheck({
				kind: "max",
				value: BigInt(0),
				inclusive: true,
				message: errorUtil$1.toString(message)
			});
		}
		nonnegative(message) {
			return this._addCheck({
				kind: "min",
				value: BigInt(0),
				inclusive: true,
				message: errorUtil$1.toString(message)
			});
		}
		multipleOf(value, message) {
			return this._addCheck({
				kind: "multipleOf",
				value,
				message: errorUtil$1.toString(message)
			});
		}
		get minValue() {
			let min = null;
			for (const ch of this._def.checks) if (ch.kind === "min") {
				if (min === null || ch.value > min) min = ch.value;
			}
			return min;
		}
		get maxValue() {
			let max = null;
			for (const ch of this._def.checks) if (ch.kind === "max") {
				if (max === null || ch.value < max) max = ch.value;
			}
			return max;
		}
	};
	ZodBigInt$1.create = (params) => {
		return new ZodBigInt$1({
			checks: [],
			typeName: ZodFirstPartyTypeKind$1.ZodBigInt,
			coerce: params?.coerce ?? false,
			...processCreateParams$1(params)
		});
	};
	var ZodBoolean$1 = class extends ZodType$1 {
		_parse(input) {
			if (this._def.coerce) input.data = Boolean(input.data);
			if (this._getType(input) !== ZodParsedType$1.boolean) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.boolean,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			return OK$1(input.data);
		}
	};
	ZodBoolean$1.create = (params) => {
		return new ZodBoolean$1({
			typeName: ZodFirstPartyTypeKind$1.ZodBoolean,
			coerce: params?.coerce || false,
			...processCreateParams$1(params)
		});
	};
	var ZodDate$1 = class ZodDate$1 extends ZodType$1 {
		_parse(input) {
			if (this._def.coerce) input.data = new Date(input.data);
			if (this._getType(input) !== ZodParsedType$1.date) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.date,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			if (Number.isNaN(input.data.getTime())) {
				addIssueToContext$1(this._getOrReturnCtx(input), { code: ZodIssueCode$1.invalid_date });
				return INVALID$1;
			}
			const status = new ParseStatus$1();
			let ctx = void 0;
			for (const check of this._def.checks) if (check.kind === "min") {
				if (input.data.getTime() < check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_small,
						message: check.message,
						inclusive: true,
						exact: false,
						minimum: check.value,
						type: "date"
					});
					status.dirty();
				}
			} else if (check.kind === "max") {
				if (input.data.getTime() > check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_big,
						message: check.message,
						inclusive: true,
						exact: false,
						maximum: check.value,
						type: "date"
					});
					status.dirty();
				}
			} else util$1.assertNever(check);
			return {
				status: status.value,
				value: new Date(input.data.getTime())
			};
		}
		_addCheck(check) {
			return new ZodDate$1({
				...this._def,
				checks: [...this._def.checks, check]
			});
		}
		min(minDate, message) {
			return this._addCheck({
				kind: "min",
				value: minDate.getTime(),
				message: errorUtil$1.toString(message)
			});
		}
		max(maxDate, message) {
			return this._addCheck({
				kind: "max",
				value: maxDate.getTime(),
				message: errorUtil$1.toString(message)
			});
		}
		get minDate() {
			let min = null;
			for (const ch of this._def.checks) if (ch.kind === "min") {
				if (min === null || ch.value > min) min = ch.value;
			}
			return min != null ? new Date(min) : null;
		}
		get maxDate() {
			let max = null;
			for (const ch of this._def.checks) if (ch.kind === "max") {
				if (max === null || ch.value < max) max = ch.value;
			}
			return max != null ? new Date(max) : null;
		}
	};
	ZodDate$1.create = (params) => {
		return new ZodDate$1({
			checks: [],
			coerce: params?.coerce || false,
			typeName: ZodFirstPartyTypeKind$1.ZodDate,
			...processCreateParams$1(params)
		});
	};
	var ZodSymbol$1 = class extends ZodType$1 {
		_parse(input) {
			if (this._getType(input) !== ZodParsedType$1.symbol) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.symbol,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			return OK$1(input.data);
		}
	};
	ZodSymbol$1.create = (params) => {
		return new ZodSymbol$1({
			typeName: ZodFirstPartyTypeKind$1.ZodSymbol,
			...processCreateParams$1(params)
		});
	};
	var ZodUndefined$1 = class extends ZodType$1 {
		_parse(input) {
			if (this._getType(input) !== ZodParsedType$1.undefined) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.undefined,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			return OK$1(input.data);
		}
	};
	ZodUndefined$1.create = (params) => {
		return new ZodUndefined$1({
			typeName: ZodFirstPartyTypeKind$1.ZodUndefined,
			...processCreateParams$1(params)
		});
	};
	var ZodNull$1 = class extends ZodType$1 {
		_parse(input) {
			if (this._getType(input) !== ZodParsedType$1.null) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.null,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			return OK$1(input.data);
		}
	};
	ZodNull$1.create = (params) => {
		return new ZodNull$1({
			typeName: ZodFirstPartyTypeKind$1.ZodNull,
			...processCreateParams$1(params)
		});
	};
	var ZodAny$1 = class extends ZodType$1 {
		constructor() {
			super(...arguments);
			this._any = true;
		}
		_parse(input) {
			return OK$1(input.data);
		}
	};
	ZodAny$1.create = (params) => {
		return new ZodAny$1({
			typeName: ZodFirstPartyTypeKind$1.ZodAny,
			...processCreateParams$1(params)
		});
	};
	var ZodUnknown$1 = class extends ZodType$1 {
		constructor() {
			super(...arguments);
			this._unknown = true;
		}
		_parse(input) {
			return OK$1(input.data);
		}
	};
	ZodUnknown$1.create = (params) => {
		return new ZodUnknown$1({
			typeName: ZodFirstPartyTypeKind$1.ZodUnknown,
			...processCreateParams$1(params)
		});
	};
	var ZodNever$1 = class extends ZodType$1 {
		_parse(input) {
			const ctx = this._getOrReturnCtx(input);
			addIssueToContext$1(ctx, {
				code: ZodIssueCode$1.invalid_type,
				expected: ZodParsedType$1.never,
				received: ctx.parsedType
			});
			return INVALID$1;
		}
	};
	ZodNever$1.create = (params) => {
		return new ZodNever$1({
			typeName: ZodFirstPartyTypeKind$1.ZodNever,
			...processCreateParams$1(params)
		});
	};
	var ZodVoid$1 = class extends ZodType$1 {
		_parse(input) {
			if (this._getType(input) !== ZodParsedType$1.undefined) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.void,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			return OK$1(input.data);
		}
	};
	ZodVoid$1.create = (params) => {
		return new ZodVoid$1({
			typeName: ZodFirstPartyTypeKind$1.ZodVoid,
			...processCreateParams$1(params)
		});
	};
	var ZodArray$1 = class ZodArray$1 extends ZodType$1 {
		_parse(input) {
			const { ctx, status } = this._processInputParams(input);
			const def = this._def;
			if (ctx.parsedType !== ZodParsedType$1.array) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.array,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			if (def.exactLength !== null) {
				const tooBig = ctx.data.length > def.exactLength.value;
				const tooSmall = ctx.data.length < def.exactLength.value;
				if (tooBig || tooSmall) {
					addIssueToContext$1(ctx, {
						code: tooBig ? ZodIssueCode$1.too_big : ZodIssueCode$1.too_small,
						minimum: tooSmall ? def.exactLength.value : void 0,
						maximum: tooBig ? def.exactLength.value : void 0,
						type: "array",
						inclusive: true,
						exact: true,
						message: def.exactLength.message
					});
					status.dirty();
				}
			}
			if (def.minLength !== null) {
				if (ctx.data.length < def.minLength.value) {
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_small,
						minimum: def.minLength.value,
						type: "array",
						inclusive: true,
						exact: false,
						message: def.minLength.message
					});
					status.dirty();
				}
			}
			if (def.maxLength !== null) {
				if (ctx.data.length > def.maxLength.value) {
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_big,
						maximum: def.maxLength.value,
						type: "array",
						inclusive: true,
						exact: false,
						message: def.maxLength.message
					});
					status.dirty();
				}
			}
			if (ctx.common.async) return Promise.all([...ctx.data].map((item, i) => {
				return def.type._parseAsync(new ParseInputLazyPath$1(ctx, item, ctx.path, i));
			})).then((result) => {
				return ParseStatus$1.mergeArray(status, result);
			});
			const result = [...ctx.data].map((item, i) => {
				return def.type._parseSync(new ParseInputLazyPath$1(ctx, item, ctx.path, i));
			});
			return ParseStatus$1.mergeArray(status, result);
		}
		get element() {
			return this._def.type;
		}
		min(minLength, message) {
			return new ZodArray$1({
				...this._def,
				minLength: {
					value: minLength,
					message: errorUtil$1.toString(message)
				}
			});
		}
		max(maxLength, message) {
			return new ZodArray$1({
				...this._def,
				maxLength: {
					value: maxLength,
					message: errorUtil$1.toString(message)
				}
			});
		}
		length(len, message) {
			return new ZodArray$1({
				...this._def,
				exactLength: {
					value: len,
					message: errorUtil$1.toString(message)
				}
			});
		}
		nonempty(message) {
			return this.min(1, message);
		}
	};
	ZodArray$1.create = (schema, params) => {
		return new ZodArray$1({
			type: schema,
			minLength: null,
			maxLength: null,
			exactLength: null,
			typeName: ZodFirstPartyTypeKind$1.ZodArray,
			...processCreateParams$1(params)
		});
	};
	function deepPartialify$1(schema) {
		if (schema instanceof ZodObject$1) {
			const newShape = {};
			for (const key in schema.shape) {
				const fieldSchema = schema.shape[key];
				newShape[key] = ZodOptional$1.create(deepPartialify$1(fieldSchema));
			}
			return new ZodObject$1({
				...schema._def,
				shape: () => newShape
			});
		} else if (schema instanceof ZodArray$1) return new ZodArray$1({
			...schema._def,
			type: deepPartialify$1(schema.element)
		});
		else if (schema instanceof ZodOptional$1) return ZodOptional$1.create(deepPartialify$1(schema.unwrap()));
		else if (schema instanceof ZodNullable$1) return ZodNullable$1.create(deepPartialify$1(schema.unwrap()));
		else if (schema instanceof ZodTuple$1) return ZodTuple$1.create(schema.items.map((item) => deepPartialify$1(item)));
		else return schema;
	}
	var ZodObject$1 = class ZodObject$1 extends ZodType$1 {
		constructor() {
			super(...arguments);
			this._cached = null;
			/**
			* @deprecated In most cases, this is no longer needed - unknown properties are now silently stripped.
			* If you want to pass through unknown properties, use `.passthrough()` instead.
			*/
			this.nonstrict = this.passthrough;
			/**
			* @deprecated Use `.extend` instead
			*  */
			this.augment = this.extend;
		}
		_getCached() {
			if (this._cached !== null) return this._cached;
			const shape = this._def.shape();
			const keys = util$1.objectKeys(shape);
			this._cached = {
				shape,
				keys
			};
			return this._cached;
		}
		_parse(input) {
			if (this._getType(input) !== ZodParsedType$1.object) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.object,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			const { status, ctx } = this._processInputParams(input);
			const { shape, keys: shapeKeys } = this._getCached();
			const extraKeys = [];
			if (!(this._def.catchall instanceof ZodNever$1 && this._def.unknownKeys === "strip")) {
				for (const key in ctx.data) if (!shapeKeys.includes(key)) extraKeys.push(key);
			}
			const pairs = [];
			for (const key of shapeKeys) {
				const keyValidator = shape[key];
				const value = ctx.data[key];
				pairs.push({
					key: {
						status: "valid",
						value: key
					},
					value: keyValidator._parse(new ParseInputLazyPath$1(ctx, value, ctx.path, key)),
					alwaysSet: key in ctx.data
				});
			}
			if (this._def.catchall instanceof ZodNever$1) {
				const unknownKeys = this._def.unknownKeys;
				if (unknownKeys === "passthrough") for (const key of extraKeys) pairs.push({
					key: {
						status: "valid",
						value: key
					},
					value: {
						status: "valid",
						value: ctx.data[key]
					}
				});
				else if (unknownKeys === "strict") {
					if (extraKeys.length > 0) {
						addIssueToContext$1(ctx, {
							code: ZodIssueCode$1.unrecognized_keys,
							keys: extraKeys
						});
						status.dirty();
					}
				} else if (unknownKeys === "strip") {} else throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
			} else {
				const catchall = this._def.catchall;
				for (const key of extraKeys) {
					const value = ctx.data[key];
					pairs.push({
						key: {
							status: "valid",
							value: key
						},
						value: catchall._parse(new ParseInputLazyPath$1(ctx, value, ctx.path, key)),
						alwaysSet: key in ctx.data
					});
				}
			}
			if (ctx.common.async) return Promise.resolve().then(async () => {
				const syncPairs = [];
				for (const pair of pairs) {
					const key = await pair.key;
					const value = await pair.value;
					syncPairs.push({
						key,
						value,
						alwaysSet: pair.alwaysSet
					});
				}
				return syncPairs;
			}).then((syncPairs) => {
				return ParseStatus$1.mergeObjectSync(status, syncPairs);
			});
			else return ParseStatus$1.mergeObjectSync(status, pairs);
		}
		get shape() {
			return this._def.shape();
		}
		strict(message) {
			errorUtil$1.errToObj;
			return new ZodObject$1({
				...this._def,
				unknownKeys: "strict",
				...message !== void 0 ? { errorMap: (issue, ctx) => {
					const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
					if (issue.code === "unrecognized_keys") return { message: errorUtil$1.errToObj(message).message ?? defaultError };
					return { message: defaultError };
				} } : {}
			});
		}
		strip() {
			return new ZodObject$1({
				...this._def,
				unknownKeys: "strip"
			});
		}
		passthrough() {
			return new ZodObject$1({
				...this._def,
				unknownKeys: "passthrough"
			});
		}
		extend(augmentation) {
			return new ZodObject$1({
				...this._def,
				shape: () => ({
					...this._def.shape(),
					...augmentation
				})
			});
		}
		/**
		* Prior to zod@1.0.12 there was a bug in the
		* inferred type of merged objects. Please
		* upgrade if you are experiencing issues.
		*/
		merge(merging) {
			return new ZodObject$1({
				unknownKeys: merging._def.unknownKeys,
				catchall: merging._def.catchall,
				shape: () => ({
					...this._def.shape(),
					...merging._def.shape()
				}),
				typeName: ZodFirstPartyTypeKind$1.ZodObject
			});
		}
		setKey(key, schema) {
			return this.augment({ [key]: schema });
		}
		catchall(index) {
			return new ZodObject$1({
				...this._def,
				catchall: index
			});
		}
		pick(mask) {
			const shape = {};
			for (const key of util$1.objectKeys(mask)) if (mask[key] && this.shape[key]) shape[key] = this.shape[key];
			return new ZodObject$1({
				...this._def,
				shape: () => shape
			});
		}
		omit(mask) {
			const shape = {};
			for (const key of util$1.objectKeys(this.shape)) if (!mask[key]) shape[key] = this.shape[key];
			return new ZodObject$1({
				...this._def,
				shape: () => shape
			});
		}
		/**
		* @deprecated
		*/
		deepPartial() {
			return deepPartialify$1(this);
		}
		partial(mask) {
			const newShape = {};
			for (const key of util$1.objectKeys(this.shape)) {
				const fieldSchema = this.shape[key];
				if (mask && !mask[key]) newShape[key] = fieldSchema;
				else newShape[key] = fieldSchema.optional();
			}
			return new ZodObject$1({
				...this._def,
				shape: () => newShape
			});
		}
		required(mask) {
			const newShape = {};
			for (const key of util$1.objectKeys(this.shape)) if (mask && !mask[key]) newShape[key] = this.shape[key];
			else {
				let newField = this.shape[key];
				while (newField instanceof ZodOptional$1) newField = newField._def.innerType;
				newShape[key] = newField;
			}
			return new ZodObject$1({
				...this._def,
				shape: () => newShape
			});
		}
		keyof() {
			return createZodEnum$1(util$1.objectKeys(this.shape));
		}
	};
	ZodObject$1.create = (shape, params) => {
		return new ZodObject$1({
			shape: () => shape,
			unknownKeys: "strip",
			catchall: ZodNever$1.create(),
			typeName: ZodFirstPartyTypeKind$1.ZodObject,
			...processCreateParams$1(params)
		});
	};
	ZodObject$1.strictCreate = (shape, params) => {
		return new ZodObject$1({
			shape: () => shape,
			unknownKeys: "strict",
			catchall: ZodNever$1.create(),
			typeName: ZodFirstPartyTypeKind$1.ZodObject,
			...processCreateParams$1(params)
		});
	};
	ZodObject$1.lazycreate = (shape, params) => {
		return new ZodObject$1({
			shape,
			unknownKeys: "strip",
			catchall: ZodNever$1.create(),
			typeName: ZodFirstPartyTypeKind$1.ZodObject,
			...processCreateParams$1(params)
		});
	};
	var ZodUnion$1 = class extends ZodType$1 {
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			const options = this._def.options;
			function handleResults(results) {
				for (const result of results) if (result.result.status === "valid") return result.result;
				for (const result of results) if (result.result.status === "dirty") {
					ctx.common.issues.push(...result.ctx.common.issues);
					return result.result;
				}
				const unionErrors = results.map((result) => new ZodError$1(result.ctx.common.issues));
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_union,
					unionErrors
				});
				return INVALID$1;
			}
			if (ctx.common.async) return Promise.all(options.map(async (option) => {
				const childCtx = {
					...ctx,
					common: {
						...ctx.common,
						issues: []
					},
					parent: null
				};
				return {
					result: await option._parseAsync({
						data: ctx.data,
						path: ctx.path,
						parent: childCtx
					}),
					ctx: childCtx
				};
			})).then(handleResults);
			else {
				let dirty = void 0;
				const issues = [];
				for (const option of options) {
					const childCtx = {
						...ctx,
						common: {
							...ctx.common,
							issues: []
						},
						parent: null
					};
					const result = option._parseSync({
						data: ctx.data,
						path: ctx.path,
						parent: childCtx
					});
					if (result.status === "valid") return result;
					else if (result.status === "dirty" && !dirty) dirty = {
						result,
						ctx: childCtx
					};
					if (childCtx.common.issues.length) issues.push(childCtx.common.issues);
				}
				if (dirty) {
					ctx.common.issues.push(...dirty.ctx.common.issues);
					return dirty.result;
				}
				const unionErrors = issues.map((issues) => new ZodError$1(issues));
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_union,
					unionErrors
				});
				return INVALID$1;
			}
		}
		get options() {
			return this._def.options;
		}
	};
	ZodUnion$1.create = (types, params) => {
		return new ZodUnion$1({
			options: types,
			typeName: ZodFirstPartyTypeKind$1.ZodUnion,
			...processCreateParams$1(params)
		});
	};
	const getDiscriminator$1 = (type) => {
		if (type instanceof ZodLazy$1) return getDiscriminator$1(type.schema);
		else if (type instanceof ZodEffects$1) return getDiscriminator$1(type.innerType());
		else if (type instanceof ZodLiteral$1) return [type.value];
		else if (type instanceof ZodEnum$1) return type.options;
		else if (type instanceof ZodNativeEnum$1) return util$1.objectValues(type.enum);
		else if (type instanceof ZodDefault$1) return getDiscriminator$1(type._def.innerType);
		else if (type instanceof ZodUndefined$1) return [void 0];
		else if (type instanceof ZodNull$1) return [null];
		else if (type instanceof ZodOptional$1) return [void 0, ...getDiscriminator$1(type.unwrap())];
		else if (type instanceof ZodNullable$1) return [null, ...getDiscriminator$1(type.unwrap())];
		else if (type instanceof ZodBranded$1) return getDiscriminator$1(type.unwrap());
		else if (type instanceof ZodReadonly$1) return getDiscriminator$1(type.unwrap());
		else if (type instanceof ZodCatch$1) return getDiscriminator$1(type._def.innerType);
		else return [];
	};
	var ZodDiscriminatedUnion$1 = class ZodDiscriminatedUnion$1 extends ZodType$1 {
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType$1.object) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.object,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			const discriminator = this.discriminator;
			const discriminatorValue = ctx.data[discriminator];
			const option = this.optionsMap.get(discriminatorValue);
			if (!option) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_union_discriminator,
					options: Array.from(this.optionsMap.keys()),
					path: [discriminator]
				});
				return INVALID$1;
			}
			if (ctx.common.async) return option._parseAsync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			});
			else return option._parseSync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			});
		}
		get discriminator() {
			return this._def.discriminator;
		}
		get options() {
			return this._def.options;
		}
		get optionsMap() {
			return this._def.optionsMap;
		}
		/**
		* The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
		* However, it only allows a union of objects, all of which need to share a discriminator property. This property must
		* have a different value for each object in the union.
		* @param discriminator the name of the discriminator property
		* @param types an array of object schemas
		* @param params
		*/
		static create(discriminator, options, params) {
			const optionsMap = /* @__PURE__ */ new Map();
			for (const type of options) {
				const discriminatorValues = getDiscriminator$1(type.shape[discriminator]);
				if (!discriminatorValues.length) throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
				for (const value of discriminatorValues) {
					if (optionsMap.has(value)) throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
					optionsMap.set(value, type);
				}
			}
			return new ZodDiscriminatedUnion$1({
				typeName: ZodFirstPartyTypeKind$1.ZodDiscriminatedUnion,
				discriminator,
				options,
				optionsMap,
				...processCreateParams$1(params)
			});
		}
	};
	function mergeValues$1(a, b) {
		const aType = getParsedType$1(a);
		const bType = getParsedType$1(b);
		if (a === b) return {
			valid: true,
			data: a
		};
		else if (aType === ZodParsedType$1.object && bType === ZodParsedType$1.object) {
			const bKeys = util$1.objectKeys(b);
			const sharedKeys = util$1.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
			const newObj = {
				...a,
				...b
			};
			for (const key of sharedKeys) {
				const sharedValue = mergeValues$1(a[key], b[key]);
				if (!sharedValue.valid) return { valid: false };
				newObj[key] = sharedValue.data;
			}
			return {
				valid: true,
				data: newObj
			};
		} else if (aType === ZodParsedType$1.array && bType === ZodParsedType$1.array) {
			if (a.length !== b.length) return { valid: false };
			const newArray = [];
			for (let index = 0; index < a.length; index++) {
				const itemA = a[index];
				const itemB = b[index];
				const sharedValue = mergeValues$1(itemA, itemB);
				if (!sharedValue.valid) return { valid: false };
				newArray.push(sharedValue.data);
			}
			return {
				valid: true,
				data: newArray
			};
		} else if (aType === ZodParsedType$1.date && bType === ZodParsedType$1.date && +a === +b) return {
			valid: true,
			data: a
		};
		else return { valid: false };
	}
	var ZodIntersection$1 = class extends ZodType$1 {
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			const handleParsed = (parsedLeft, parsedRight) => {
				if (isAborted$1(parsedLeft) || isAborted$1(parsedRight)) return INVALID$1;
				const merged = mergeValues$1(parsedLeft.value, parsedRight.value);
				if (!merged.valid) {
					addIssueToContext$1(ctx, { code: ZodIssueCode$1.invalid_intersection_types });
					return INVALID$1;
				}
				if (isDirty$1(parsedLeft) || isDirty$1(parsedRight)) status.dirty();
				return {
					status: status.value,
					value: merged.data
				};
			};
			if (ctx.common.async) return Promise.all([this._def.left._parseAsync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			}), this._def.right._parseAsync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			})]).then(([left, right]) => handleParsed(left, right));
			else return handleParsed(this._def.left._parseSync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			}), this._def.right._parseSync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			}));
		}
	};
	ZodIntersection$1.create = (left, right, params) => {
		return new ZodIntersection$1({
			left,
			right,
			typeName: ZodFirstPartyTypeKind$1.ZodIntersection,
			...processCreateParams$1(params)
		});
	};
	var ZodTuple$1 = class ZodTuple$1 extends ZodType$1 {
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType$1.array) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.array,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			if (ctx.data.length < this._def.items.length) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.too_small,
					minimum: this._def.items.length,
					inclusive: true,
					exact: false,
					type: "array"
				});
				return INVALID$1;
			}
			if (!this._def.rest && ctx.data.length > this._def.items.length) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.too_big,
					maximum: this._def.items.length,
					inclusive: true,
					exact: false,
					type: "array"
				});
				status.dirty();
			}
			const items = [...ctx.data].map((item, itemIndex) => {
				const schema = this._def.items[itemIndex] || this._def.rest;
				if (!schema) return null;
				return schema._parse(new ParseInputLazyPath$1(ctx, item, ctx.path, itemIndex));
			}).filter((x) => !!x);
			if (ctx.common.async) return Promise.all(items).then((results) => {
				return ParseStatus$1.mergeArray(status, results);
			});
			else return ParseStatus$1.mergeArray(status, items);
		}
		get items() {
			return this._def.items;
		}
		rest(rest) {
			return new ZodTuple$1({
				...this._def,
				rest
			});
		}
	};
	ZodTuple$1.create = (schemas, params) => {
		if (!Array.isArray(schemas)) throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
		return new ZodTuple$1({
			items: schemas,
			typeName: ZodFirstPartyTypeKind$1.ZodTuple,
			rest: null,
			...processCreateParams$1(params)
		});
	};
	var ZodRecord$1 = class ZodRecord$1 extends ZodType$1 {
		get keySchema() {
			return this._def.keyType;
		}
		get valueSchema() {
			return this._def.valueType;
		}
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType$1.object) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.object,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			const pairs = [];
			const keyType = this._def.keyType;
			const valueType = this._def.valueType;
			for (const key in ctx.data) pairs.push({
				key: keyType._parse(new ParseInputLazyPath$1(ctx, key, ctx.path, key)),
				value: valueType._parse(new ParseInputLazyPath$1(ctx, ctx.data[key], ctx.path, key)),
				alwaysSet: key in ctx.data
			});
			if (ctx.common.async) return ParseStatus$1.mergeObjectAsync(status, pairs);
			else return ParseStatus$1.mergeObjectSync(status, pairs);
		}
		get element() {
			return this._def.valueType;
		}
		static create(first, second, third) {
			if (second instanceof ZodType$1) return new ZodRecord$1({
				keyType: first,
				valueType: second,
				typeName: ZodFirstPartyTypeKind$1.ZodRecord,
				...processCreateParams$1(third)
			});
			return new ZodRecord$1({
				keyType: ZodString$1.create(),
				valueType: first,
				typeName: ZodFirstPartyTypeKind$1.ZodRecord,
				...processCreateParams$1(second)
			});
		}
	};
	var ZodMap$1 = class extends ZodType$1 {
		get keySchema() {
			return this._def.keyType;
		}
		get valueSchema() {
			return this._def.valueType;
		}
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType$1.map) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.map,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			const keyType = this._def.keyType;
			const valueType = this._def.valueType;
			const pairs = [...ctx.data.entries()].map(([key, value], index) => {
				return {
					key: keyType._parse(new ParseInputLazyPath$1(ctx, key, ctx.path, [index, "key"])),
					value: valueType._parse(new ParseInputLazyPath$1(ctx, value, ctx.path, [index, "value"]))
				};
			});
			if (ctx.common.async) {
				const finalMap = /* @__PURE__ */ new Map();
				return Promise.resolve().then(async () => {
					for (const pair of pairs) {
						const key = await pair.key;
						const value = await pair.value;
						if (key.status === "aborted" || value.status === "aborted") return INVALID$1;
						if (key.status === "dirty" || value.status === "dirty") status.dirty();
						finalMap.set(key.value, value.value);
					}
					return {
						status: status.value,
						value: finalMap
					};
				});
			} else {
				const finalMap = /* @__PURE__ */ new Map();
				for (const pair of pairs) {
					const key = pair.key;
					const value = pair.value;
					if (key.status === "aborted" || value.status === "aborted") return INVALID$1;
					if (key.status === "dirty" || value.status === "dirty") status.dirty();
					finalMap.set(key.value, value.value);
				}
				return {
					status: status.value,
					value: finalMap
				};
			}
		}
	};
	ZodMap$1.create = (keyType, valueType, params) => {
		return new ZodMap$1({
			valueType,
			keyType,
			typeName: ZodFirstPartyTypeKind$1.ZodMap,
			...processCreateParams$1(params)
		});
	};
	var ZodSet$1 = class ZodSet$1 extends ZodType$1 {
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType$1.set) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.set,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			const def = this._def;
			if (def.minSize !== null) {
				if (ctx.data.size < def.minSize.value) {
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_small,
						minimum: def.minSize.value,
						type: "set",
						inclusive: true,
						exact: false,
						message: def.minSize.message
					});
					status.dirty();
				}
			}
			if (def.maxSize !== null) {
				if (ctx.data.size > def.maxSize.value) {
					addIssueToContext$1(ctx, {
						code: ZodIssueCode$1.too_big,
						maximum: def.maxSize.value,
						type: "set",
						inclusive: true,
						exact: false,
						message: def.maxSize.message
					});
					status.dirty();
				}
			}
			const valueType = this._def.valueType;
			function finalizeSet(elements) {
				const parsedSet = /* @__PURE__ */ new Set();
				for (const element of elements) {
					if (element.status === "aborted") return INVALID$1;
					if (element.status === "dirty") status.dirty();
					parsedSet.add(element.value);
				}
				return {
					status: status.value,
					value: parsedSet
				};
			}
			const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath$1(ctx, item, ctx.path, i)));
			if (ctx.common.async) return Promise.all(elements).then((elements) => finalizeSet(elements));
			else return finalizeSet(elements);
		}
		min(minSize, message) {
			return new ZodSet$1({
				...this._def,
				minSize: {
					value: minSize,
					message: errorUtil$1.toString(message)
				}
			});
		}
		max(maxSize, message) {
			return new ZodSet$1({
				...this._def,
				maxSize: {
					value: maxSize,
					message: errorUtil$1.toString(message)
				}
			});
		}
		size(size, message) {
			return this.min(size, message).max(size, message);
		}
		nonempty(message) {
			return this.min(1, message);
		}
	};
	ZodSet$1.create = (valueType, params) => {
		return new ZodSet$1({
			valueType,
			minSize: null,
			maxSize: null,
			typeName: ZodFirstPartyTypeKind$1.ZodSet,
			...processCreateParams$1(params)
		});
	};
	var ZodFunction$1 = class ZodFunction$1 extends ZodType$1 {
		constructor() {
			super(...arguments);
			this.validate = this.implement;
		}
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType$1.function) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.function,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			function makeArgsIssue(args, error) {
				return makeIssue$1({
					data: args,
					path: ctx.path,
					errorMaps: [
						ctx.common.contextualErrorMap,
						ctx.schemaErrorMap,
						getErrorMap$1(),
						errorMap$1
					].filter((x) => !!x),
					issueData: {
						code: ZodIssueCode$1.invalid_arguments,
						argumentsError: error
					}
				});
			}
			function makeReturnsIssue(returns, error) {
				return makeIssue$1({
					data: returns,
					path: ctx.path,
					errorMaps: [
						ctx.common.contextualErrorMap,
						ctx.schemaErrorMap,
						getErrorMap$1(),
						errorMap$1
					].filter((x) => !!x),
					issueData: {
						code: ZodIssueCode$1.invalid_return_type,
						returnTypeError: error
					}
				});
			}
			const params = { errorMap: ctx.common.contextualErrorMap };
			const fn = ctx.data;
			if (this._def.returns instanceof ZodPromise$1) {
				const me = this;
				return OK$1(async function(...args) {
					const error = new ZodError$1([]);
					const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
						error.addIssue(makeArgsIssue(args, e));
						throw error;
					});
					const result = await Reflect.apply(fn, this, parsedArgs);
					return await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
						error.addIssue(makeReturnsIssue(result, e));
						throw error;
					});
				});
			} else {
				const me = this;
				return OK$1(function(...args) {
					const parsedArgs = me._def.args.safeParse(args, params);
					if (!parsedArgs.success) throw new ZodError$1([makeArgsIssue(args, parsedArgs.error)]);
					const result = Reflect.apply(fn, this, parsedArgs.data);
					const parsedReturns = me._def.returns.safeParse(result, params);
					if (!parsedReturns.success) throw new ZodError$1([makeReturnsIssue(result, parsedReturns.error)]);
					return parsedReturns.data;
				});
			}
		}
		parameters() {
			return this._def.args;
		}
		returnType() {
			return this._def.returns;
		}
		args(...items) {
			return new ZodFunction$1({
				...this._def,
				args: ZodTuple$1.create(items).rest(ZodUnknown$1.create())
			});
		}
		returns(returnType) {
			return new ZodFunction$1({
				...this._def,
				returns: returnType
			});
		}
		implement(func) {
			return this.parse(func);
		}
		strictImplement(func) {
			return this.parse(func);
		}
		static create(args, returns, params) {
			return new ZodFunction$1({
				args: args ? args : ZodTuple$1.create([]).rest(ZodUnknown$1.create()),
				returns: returns || ZodUnknown$1.create(),
				typeName: ZodFirstPartyTypeKind$1.ZodFunction,
				...processCreateParams$1(params)
			});
		}
	};
	var ZodLazy$1 = class extends ZodType$1 {
		get schema() {
			return this._def.getter();
		}
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			return this._def.getter()._parse({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			});
		}
	};
	ZodLazy$1.create = (getter, params) => {
		return new ZodLazy$1({
			getter,
			typeName: ZodFirstPartyTypeKind$1.ZodLazy,
			...processCreateParams$1(params)
		});
	};
	var ZodLiteral$1 = class extends ZodType$1 {
		_parse(input) {
			if (input.data !== this._def.value) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					received: ctx.data,
					code: ZodIssueCode$1.invalid_literal,
					expected: this._def.value
				});
				return INVALID$1;
			}
			return {
				status: "valid",
				value: input.data
			};
		}
		get value() {
			return this._def.value;
		}
	};
	ZodLiteral$1.create = (value, params) => {
		return new ZodLiteral$1({
			value,
			typeName: ZodFirstPartyTypeKind$1.ZodLiteral,
			...processCreateParams$1(params)
		});
	};
	function createZodEnum$1(values, params) {
		return new ZodEnum$1({
			values,
			typeName: ZodFirstPartyTypeKind$1.ZodEnum,
			...processCreateParams$1(params)
		});
	}
	var ZodEnum$1 = class ZodEnum$1 extends ZodType$1 {
		_parse(input) {
			if (typeof input.data !== "string") {
				const ctx = this._getOrReturnCtx(input);
				const expectedValues = this._def.values;
				addIssueToContext$1(ctx, {
					expected: util$1.joinValues(expectedValues),
					received: ctx.parsedType,
					code: ZodIssueCode$1.invalid_type
				});
				return INVALID$1;
			}
			if (!this._cache) this._cache = new Set(this._def.values);
			if (!this._cache.has(input.data)) {
				const ctx = this._getOrReturnCtx(input);
				const expectedValues = this._def.values;
				addIssueToContext$1(ctx, {
					received: ctx.data,
					code: ZodIssueCode$1.invalid_enum_value,
					options: expectedValues
				});
				return INVALID$1;
			}
			return OK$1(input.data);
		}
		get options() {
			return this._def.values;
		}
		get enum() {
			const enumValues = {};
			for (const val of this._def.values) enumValues[val] = val;
			return enumValues;
		}
		get Values() {
			const enumValues = {};
			for (const val of this._def.values) enumValues[val] = val;
			return enumValues;
		}
		get Enum() {
			const enumValues = {};
			for (const val of this._def.values) enumValues[val] = val;
			return enumValues;
		}
		extract(values, newDef = this._def) {
			return ZodEnum$1.create(values, {
				...this._def,
				...newDef
			});
		}
		exclude(values, newDef = this._def) {
			return ZodEnum$1.create(this.options.filter((opt) => !values.includes(opt)), {
				...this._def,
				...newDef
			});
		}
	};
	ZodEnum$1.create = createZodEnum$1;
	var ZodNativeEnum$1 = class extends ZodType$1 {
		_parse(input) {
			const nativeEnumValues = util$1.getValidEnumValues(this._def.values);
			const ctx = this._getOrReturnCtx(input);
			if (ctx.parsedType !== ZodParsedType$1.string && ctx.parsedType !== ZodParsedType$1.number) {
				const expectedValues = util$1.objectValues(nativeEnumValues);
				addIssueToContext$1(ctx, {
					expected: util$1.joinValues(expectedValues),
					received: ctx.parsedType,
					code: ZodIssueCode$1.invalid_type
				});
				return INVALID$1;
			}
			if (!this._cache) this._cache = new Set(util$1.getValidEnumValues(this._def.values));
			if (!this._cache.has(input.data)) {
				const expectedValues = util$1.objectValues(nativeEnumValues);
				addIssueToContext$1(ctx, {
					received: ctx.data,
					code: ZodIssueCode$1.invalid_enum_value,
					options: expectedValues
				});
				return INVALID$1;
			}
			return OK$1(input.data);
		}
		get enum() {
			return this._def.values;
		}
	};
	ZodNativeEnum$1.create = (values, params) => {
		return new ZodNativeEnum$1({
			values,
			typeName: ZodFirstPartyTypeKind$1.ZodNativeEnum,
			...processCreateParams$1(params)
		});
	};
	var ZodPromise$1 = class extends ZodType$1 {
		unwrap() {
			return this._def.type;
		}
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType$1.promise && ctx.common.async === false) {
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.promise,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			return OK$1((ctx.parsedType === ZodParsedType$1.promise ? ctx.data : Promise.resolve(ctx.data)).then((data) => {
				return this._def.type.parseAsync(data, {
					path: ctx.path,
					errorMap: ctx.common.contextualErrorMap
				});
			}));
		}
	};
	ZodPromise$1.create = (schema, params) => {
		return new ZodPromise$1({
			type: schema,
			typeName: ZodFirstPartyTypeKind$1.ZodPromise,
			...processCreateParams$1(params)
		});
	};
	var ZodEffects$1 = class extends ZodType$1 {
		innerType() {
			return this._def.schema;
		}
		sourceType() {
			return this._def.schema._def.typeName === ZodFirstPartyTypeKind$1.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
		}
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			const effect = this._def.effect || null;
			const checkCtx = {
				addIssue: (arg) => {
					addIssueToContext$1(ctx, arg);
					if (arg.fatal) status.abort();
					else status.dirty();
				},
				get path() {
					return ctx.path;
				}
			};
			checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
			if (effect.type === "preprocess") {
				const processed = effect.transform(ctx.data, checkCtx);
				if (ctx.common.async) return Promise.resolve(processed).then(async (processed) => {
					if (status.value === "aborted") return INVALID$1;
					const result = await this._def.schema._parseAsync({
						data: processed,
						path: ctx.path,
						parent: ctx
					});
					if (result.status === "aborted") return INVALID$1;
					if (result.status === "dirty") return DIRTY$1(result.value);
					if (status.value === "dirty") return DIRTY$1(result.value);
					return result;
				});
				else {
					if (status.value === "aborted") return INVALID$1;
					const result = this._def.schema._parseSync({
						data: processed,
						path: ctx.path,
						parent: ctx
					});
					if (result.status === "aborted") return INVALID$1;
					if (result.status === "dirty") return DIRTY$1(result.value);
					if (status.value === "dirty") return DIRTY$1(result.value);
					return result;
				}
			}
			if (effect.type === "refinement") {
				const executeRefinement = (acc) => {
					const result = effect.refinement(acc, checkCtx);
					if (ctx.common.async) return Promise.resolve(result);
					if (result instanceof Promise) throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
					return acc;
				};
				if (ctx.common.async === false) {
					const inner = this._def.schema._parseSync({
						data: ctx.data,
						path: ctx.path,
						parent: ctx
					});
					if (inner.status === "aborted") return INVALID$1;
					if (inner.status === "dirty") status.dirty();
					executeRefinement(inner.value);
					return {
						status: status.value,
						value: inner.value
					};
				} else return this._def.schema._parseAsync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				}).then((inner) => {
					if (inner.status === "aborted") return INVALID$1;
					if (inner.status === "dirty") status.dirty();
					return executeRefinement(inner.value).then(() => {
						return {
							status: status.value,
							value: inner.value
						};
					});
				});
			}
			if (effect.type === "transform") if (ctx.common.async === false) {
				const base = this._def.schema._parseSync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				});
				if (!isValid$1(base)) return INVALID$1;
				const result = effect.transform(base.value, checkCtx);
				if (result instanceof Promise) throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
				return {
					status: status.value,
					value: result
				};
			} else return this._def.schema._parseAsync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			}).then((base) => {
				if (!isValid$1(base)) return INVALID$1;
				return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
					status: status.value,
					value: result
				}));
			});
			util$1.assertNever(effect);
		}
	};
	ZodEffects$1.create = (schema, effect, params) => {
		return new ZodEffects$1({
			schema,
			typeName: ZodFirstPartyTypeKind$1.ZodEffects,
			effect,
			...processCreateParams$1(params)
		});
	};
	ZodEffects$1.createWithPreprocess = (preprocess, schema, params) => {
		return new ZodEffects$1({
			schema,
			effect: {
				type: "preprocess",
				transform: preprocess
			},
			typeName: ZodFirstPartyTypeKind$1.ZodEffects,
			...processCreateParams$1(params)
		});
	};
	var ZodOptional$1 = class extends ZodType$1 {
		_parse(input) {
			if (this._getType(input) === ZodParsedType$1.undefined) return OK$1(void 0);
			return this._def.innerType._parse(input);
		}
		unwrap() {
			return this._def.innerType;
		}
	};
	ZodOptional$1.create = (type, params) => {
		return new ZodOptional$1({
			innerType: type,
			typeName: ZodFirstPartyTypeKind$1.ZodOptional,
			...processCreateParams$1(params)
		});
	};
	var ZodNullable$1 = class extends ZodType$1 {
		_parse(input) {
			if (this._getType(input) === ZodParsedType$1.null) return OK$1(null);
			return this._def.innerType._parse(input);
		}
		unwrap() {
			return this._def.innerType;
		}
	};
	ZodNullable$1.create = (type, params) => {
		return new ZodNullable$1({
			innerType: type,
			typeName: ZodFirstPartyTypeKind$1.ZodNullable,
			...processCreateParams$1(params)
		});
	};
	var ZodDefault$1 = class extends ZodType$1 {
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			let data = ctx.data;
			if (ctx.parsedType === ZodParsedType$1.undefined) data = this._def.defaultValue();
			return this._def.innerType._parse({
				data,
				path: ctx.path,
				parent: ctx
			});
		}
		removeDefault() {
			return this._def.innerType;
		}
	};
	ZodDefault$1.create = (type, params) => {
		return new ZodDefault$1({
			innerType: type,
			typeName: ZodFirstPartyTypeKind$1.ZodDefault,
			defaultValue: typeof params.default === "function" ? params.default : () => params.default,
			...processCreateParams$1(params)
		});
	};
	var ZodCatch$1 = class extends ZodType$1 {
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			const newCtx = {
				...ctx,
				common: {
					...ctx.common,
					issues: []
				}
			};
			const result = this._def.innerType._parse({
				data: newCtx.data,
				path: newCtx.path,
				parent: { ...newCtx }
			});
			if (isAsync$1(result)) return result.then((result) => {
				return {
					status: "valid",
					value: result.status === "valid" ? result.value : this._def.catchValue({
						get error() {
							return new ZodError$1(newCtx.common.issues);
						},
						input: newCtx.data
					})
				};
			});
			else return {
				status: "valid",
				value: result.status === "valid" ? result.value : this._def.catchValue({
					get error() {
						return new ZodError$1(newCtx.common.issues);
					},
					input: newCtx.data
				})
			};
		}
		removeCatch() {
			return this._def.innerType;
		}
	};
	ZodCatch$1.create = (type, params) => {
		return new ZodCatch$1({
			innerType: type,
			typeName: ZodFirstPartyTypeKind$1.ZodCatch,
			catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
			...processCreateParams$1(params)
		});
	};
	var ZodNaN$1 = class extends ZodType$1 {
		_parse(input) {
			if (this._getType(input) !== ZodParsedType$1.nan) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext$1(ctx, {
					code: ZodIssueCode$1.invalid_type,
					expected: ZodParsedType$1.nan,
					received: ctx.parsedType
				});
				return INVALID$1;
			}
			return {
				status: "valid",
				value: input.data
			};
		}
	};
	ZodNaN$1.create = (params) => {
		return new ZodNaN$1({
			typeName: ZodFirstPartyTypeKind$1.ZodNaN,
			...processCreateParams$1(params)
		});
	};
	var ZodBranded$1 = class extends ZodType$1 {
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			const data = ctx.data;
			return this._def.type._parse({
				data,
				path: ctx.path,
				parent: ctx
			});
		}
		unwrap() {
			return this._def.type;
		}
	};
	var ZodPipeline$1 = class ZodPipeline$1 extends ZodType$1 {
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			if (ctx.common.async) {
				const handleAsync = async () => {
					const inResult = await this._def.in._parseAsync({
						data: ctx.data,
						path: ctx.path,
						parent: ctx
					});
					if (inResult.status === "aborted") return INVALID$1;
					if (inResult.status === "dirty") {
						status.dirty();
						return DIRTY$1(inResult.value);
					} else return this._def.out._parseAsync({
						data: inResult.value,
						path: ctx.path,
						parent: ctx
					});
				};
				return handleAsync();
			} else {
				const inResult = this._def.in._parseSync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				});
				if (inResult.status === "aborted") return INVALID$1;
				if (inResult.status === "dirty") {
					status.dirty();
					return {
						status: "dirty",
						value: inResult.value
					};
				} else return this._def.out._parseSync({
					data: inResult.value,
					path: ctx.path,
					parent: ctx
				});
			}
		}
		static create(a, b) {
			return new ZodPipeline$1({
				in: a,
				out: b,
				typeName: ZodFirstPartyTypeKind$1.ZodPipeline
			});
		}
	};
	var ZodReadonly$1 = class extends ZodType$1 {
		_parse(input) {
			const result = this._def.innerType._parse(input);
			const freeze = (data) => {
				if (isValid$1(data)) data.value = Object.freeze(data.value);
				return data;
			};
			return isAsync$1(result) ? result.then((data) => freeze(data)) : freeze(result);
		}
		unwrap() {
			return this._def.innerType;
		}
	};
	ZodReadonly$1.create = (type, params) => {
		return new ZodReadonly$1({
			innerType: type,
			typeName: ZodFirstPartyTypeKind$1.ZodReadonly,
			...processCreateParams$1(params)
		});
	};
	ZodObject$1.lazycreate;
	var ZodFirstPartyTypeKind$1;
	(function(ZodFirstPartyTypeKind) {
		ZodFirstPartyTypeKind["ZodString"] = "ZodString";
		ZodFirstPartyTypeKind["ZodNumber"] = "ZodNumber";
		ZodFirstPartyTypeKind["ZodNaN"] = "ZodNaN";
		ZodFirstPartyTypeKind["ZodBigInt"] = "ZodBigInt";
		ZodFirstPartyTypeKind["ZodBoolean"] = "ZodBoolean";
		ZodFirstPartyTypeKind["ZodDate"] = "ZodDate";
		ZodFirstPartyTypeKind["ZodSymbol"] = "ZodSymbol";
		ZodFirstPartyTypeKind["ZodUndefined"] = "ZodUndefined";
		ZodFirstPartyTypeKind["ZodNull"] = "ZodNull";
		ZodFirstPartyTypeKind["ZodAny"] = "ZodAny";
		ZodFirstPartyTypeKind["ZodUnknown"] = "ZodUnknown";
		ZodFirstPartyTypeKind["ZodNever"] = "ZodNever";
		ZodFirstPartyTypeKind["ZodVoid"] = "ZodVoid";
		ZodFirstPartyTypeKind["ZodArray"] = "ZodArray";
		ZodFirstPartyTypeKind["ZodObject"] = "ZodObject";
		ZodFirstPartyTypeKind["ZodUnion"] = "ZodUnion";
		ZodFirstPartyTypeKind["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
		ZodFirstPartyTypeKind["ZodIntersection"] = "ZodIntersection";
		ZodFirstPartyTypeKind["ZodTuple"] = "ZodTuple";
		ZodFirstPartyTypeKind["ZodRecord"] = "ZodRecord";
		ZodFirstPartyTypeKind["ZodMap"] = "ZodMap";
		ZodFirstPartyTypeKind["ZodSet"] = "ZodSet";
		ZodFirstPartyTypeKind["ZodFunction"] = "ZodFunction";
		ZodFirstPartyTypeKind["ZodLazy"] = "ZodLazy";
		ZodFirstPartyTypeKind["ZodLiteral"] = "ZodLiteral";
		ZodFirstPartyTypeKind["ZodEnum"] = "ZodEnum";
		ZodFirstPartyTypeKind["ZodEffects"] = "ZodEffects";
		ZodFirstPartyTypeKind["ZodNativeEnum"] = "ZodNativeEnum";
		ZodFirstPartyTypeKind["ZodOptional"] = "ZodOptional";
		ZodFirstPartyTypeKind["ZodNullable"] = "ZodNullable";
		ZodFirstPartyTypeKind["ZodDefault"] = "ZodDefault";
		ZodFirstPartyTypeKind["ZodCatch"] = "ZodCatch";
		ZodFirstPartyTypeKind["ZodPromise"] = "ZodPromise";
		ZodFirstPartyTypeKind["ZodBranded"] = "ZodBranded";
		ZodFirstPartyTypeKind["ZodPipeline"] = "ZodPipeline";
		ZodFirstPartyTypeKind["ZodReadonly"] = "ZodReadonly";
	})(ZodFirstPartyTypeKind$1 || (ZodFirstPartyTypeKind$1 = {}));
	const stringType$1 = ZodString$1.create;
	const numberType$1 = ZodNumber$1.create;
	ZodNaN$1.create;
	ZodBigInt$1.create;
	const booleanType$1 = ZodBoolean$1.create;
	ZodDate$1.create;
	ZodSymbol$1.create;
	ZodUndefined$1.create;
	ZodNull$1.create;
	ZodAny$1.create;
	const unknownType$1 = ZodUnknown$1.create;
	ZodNever$1.create;
	ZodVoid$1.create;
	const arrayType$1 = ZodArray$1.create;
	const objectType$1 = ZodObject$1.create;
	ZodObject$1.strictCreate;
	ZodUnion$1.create;
	ZodDiscriminatedUnion$1.create;
	ZodIntersection$1.create;
	ZodTuple$1.create;
	const recordType$1 = ZodRecord$1.create;
	ZodMap$1.create;
	ZodSet$1.create;
	ZodFunction$1.create;
	ZodLazy$1.create;
	const literalType$1 = ZodLiteral$1.create;
	const enumType$1 = ZodEnum$1.create;
	ZodNativeEnum$1.create;
	ZodPromise$1.create;
	ZodEffects$1.create;
	ZodOptional$1.create;
	ZodNullable$1.create;
	ZodEffects$1.createWithPreprocess;
	ZodPipeline$1.create;
	objectType$1({
		type: literalType$1("plain"),
		content: stringType$1()
	});
	objectType$1({
		from: numberType$1().min(0),
		to: numberType$1().min(1)
	});
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/util.js
	function assertNever(x) {
		throw new Error("Unexpected object: " + x);
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/drivers/pframe/data_info.js
	/**
	* Type guard function that checks if the given value is a valid DataInfo.
	*
	* @param value - The value to check
	* @returns True if the value is a valid DataInfo, false otherwise
	*/
	function isDataInfo(value) {
		if (!value || typeof value !== "object") return false;
		const data = value;
		if (!("type" in data)) return false;
		switch (data.type) {
			case "Json": return typeof data.keyLength === "number" && data.data !== void 0 && typeof data.data === "object";
			case "JsonPartitioned":
			case "BinaryPartitioned":
			case "ParquetPartitioned": return typeof data.partitionKeyLength === "number" && data.parts !== void 0 && typeof data.parts === "object";
			default: return false;
		}
	}
	function mapDataInfo(dataInfo, mapFn) {
		if (dataInfo === void 0) return;
		switch (dataInfo.type) {
			case "Json": return dataInfo;
			case "JsonPartitioned": {
				const newParts = {};
				for (const [key, blob] of Object.entries(dataInfo.parts)) newParts[key] = mapFn(blob);
				return {
					...dataInfo,
					parts: newParts
				};
			}
			case "BinaryPartitioned": {
				const newParts = {};
				for (const [key, chunk] of Object.entries(dataInfo.parts)) newParts[key] = {
					index: mapFn(chunk.index),
					values: mapFn(chunk.values)
				};
				return {
					...dataInfo,
					parts: newParts
				};
			}
			case "ParquetPartitioned": {
				const newParts = {};
				for (const [key, blob] of Object.entries(dataInfo.parts)) newParts[key] = mapFn(blob);
				return {
					...dataInfo,
					parts: newParts
				};
			}
		}
	}
	/**
	* @param dataInfo - The source DataInfo object
	* @param cb - Callback, function that have access to every blob to visit them all
	* @returns Nothing
	*/
	function visitDataInfo(dataInfo, cb) {
		switch (dataInfo.type) {
			case "Json": break;
			case "JsonPartitioned":
				Object.values(dataInfo.parts).forEach(cb);
				break;
			case "BinaryPartitioned":
				Object.values(dataInfo.parts).forEach((chunk) => {
					cb(chunk.index);
					cb(chunk.values);
				});
				break;
			case "ParquetPartitioned":
				Object.values(dataInfo.parts).forEach(cb);
				break;
		}
	}
	/**
	* Type guard function that checks if the given value is a valid DataInfoEntries.
	*
	* @param value - The value to check
	* @returns True if the value is a valid DataInfoEntries, false otherwise
	*/
	function isDataInfoEntries(value) {
		if (!value || typeof value !== "object") return false;
		const data = value;
		if (!("type" in data)) return false;
		switch (data.type) {
			case "Json": return typeof data.keyLength === "number" && Array.isArray(data.data);
			case "JsonPartitioned":
			case "BinaryPartitioned":
			case "ParquetPartitioned": return typeof data.partitionKeyLength === "number" && Array.isArray(data.parts);
			default: return false;
		}
	}
	/**
	* Type guard function that checks if the given value is a valid PartitionedDataInfoEntries.
	*
	* @template Blob - Type parameter representing the storage reference type
	* @param value - The value to check
	* @returns True if the value is a valid PartitionedDataInfoEntries, false otherwise
	*/
	function isPartitionedDataInfoEntries(value) {
		if (!isDataInfoEntries(value)) return false;
		switch (value.type) {
			case "JsonPartitioned":
			case "BinaryPartitioned":
			case "ParquetPartitioned": return true;
			default: return false;
		}
	}
	/**
	* Converts DataInfo to DataInfoEntries
	*
	* @param dataInfo - The record-based DataInfo object
	* @returns The equivalent entry-based DataInfoEntries object
	*/
	function dataInfoToEntries(dataInfo) {
		switch (dataInfo.type) {
			case "Json": return {
				type: "Json",
				keyLength: dataInfo.keyLength,
				data: Object.entries(dataInfo.data).map(([keyStr, value]) => {
					return {
						key: JSON.parse(keyStr),
						value
					};
				})
			};
			case "JsonPartitioned": return {
				type: "JsonPartitioned",
				partitionKeyLength: dataInfo.partitionKeyLength,
				parts: Object.entries(dataInfo.parts).map(([keyStr, blob]) => {
					return {
						key: JSON.parse(keyStr),
						value: blob
					};
				})
			};
			case "BinaryPartitioned": return {
				type: "BinaryPartitioned",
				partitionKeyLength: dataInfo.partitionKeyLength,
				parts: Object.entries(dataInfo.parts).map(([keyStr, chunk]) => {
					return {
						key: JSON.parse(keyStr),
						value: chunk
					};
				})
			};
			case "ParquetPartitioned": return {
				type: "ParquetPartitioned",
				partitionKeyLength: dataInfo.partitionKeyLength,
				parts: Object.entries(dataInfo.parts).map(([keyStr, blob]) => {
					return {
						key: JSON.parse(keyStr),
						value: blob
					};
				})
			};
			default: assertNever(dataInfo);
		}
	}
	/**
	* Converts DataInfoEntries to DataInfo
	*
	* @param dataInfoEntries - The entry-based DataInfoEntries object
	* @returns The equivalent record-based DataInfo object
	*/
	function entriesToDataInfo(dataInfoEntries) {
		switch (dataInfoEntries.type) {
			case "Json": return {
				type: "Json",
				keyLength: dataInfoEntries.keyLength,
				data: Object.fromEntries(dataInfoEntries.data.map(({ key, value }) => [JSON.stringify(key), value]))
			};
			case "JsonPartitioned": return {
				type: "JsonPartitioned",
				partitionKeyLength: dataInfoEntries.partitionKeyLength,
				parts: Object.fromEntries(dataInfoEntries.parts.map(({ key, value }) => [JSON.stringify(key), value]))
			};
			case "BinaryPartitioned": return {
				type: "BinaryPartitioned",
				partitionKeyLength: dataInfoEntries.partitionKeyLength,
				parts: Object.fromEntries(dataInfoEntries.parts.map(({ key, value }) => [JSON.stringify(key), value]))
			};
			case "ParquetPartitioned": return {
				type: "ParquetPartitioned",
				partitionKeyLength: dataInfoEntries.partitionKeyLength,
				parts: Object.fromEntries(dataInfoEntries.parts.map(({ key, value }) => [JSON.stringify(key), value]))
			};
			default: assertNever(dataInfoEntries);
		}
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/errors.js
	var ServiceError = class extends Error {
		name = "ServiceError";
	};
	var ServiceInvalidIdError = class extends ServiceError {
		name = "ServiceError.InvalidId";
	};
	var ServiceAlreadyRegisteredError = class extends ServiceError {
		name = "ServiceError.AlreadyRegistered";
	};
	function stringifyValue(value) {
		if (typeof value === "string") return `String value was thrown: ${value}`;
		if (value && typeof value === "object") try {
			return `Plain object was thrown: ${JSON.stringify(value)}`;
		} catch (jsonError) {
			return `Non-serializable object was thrown (JSON.stringify failed: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}): ${String(value)}`;
		}
		return String(`Non-Error value (${typeof value}) was thrown: ${value}`);
	}
	function ensureError(value) {
		if (value instanceof Error) return value;
		return new Error(stringifyValue(value));
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/json.js
	var import_canonicalize = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
		module.exports = function serialize(object) {
			if (typeof object === "number" && isNaN(object)) throw new Error("NaN is not allowed");
			if (typeof object === "number" && !isFinite(object)) throw new Error("Infinity is not allowed");
			if (object === null || typeof object !== "object") return JSON.stringify(object);
			if (object.toJSON instanceof Function) return serialize(object.toJSON());
			if (Array.isArray(object)) return `[${object.reduce((t, cv, ci) => {
				return `${t}${ci === 0 ? "" : ","}${serialize(cv === void 0 || typeof cv === "symbol" ? null : cv)}`;
			}, "")}]`;
			return `{${Object.keys(object).sort().reduce((t, cv) => {
				if (object[cv] === void 0 || typeof object[cv] === "symbol") return t;
				return `${t}${t.length === 0 ? "" : ","}${serialize(cv)}:${serialize(object[cv])}`;
			}, "")}}`;
		};
	})))(), 1);
	function stringifyJson(value) {
		return JSON.stringify(value);
	}
	function canonicalizeJson(value) {
		return (0, import_canonicalize.default)(value);
	}
	function parseJson(value) {
		return JSON.parse(value);
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/drivers/pframe/spec/spec.js
	function readMetadata(metadata, key) {
		return metadata?.[key];
	}
	function readMetadataJsonOrThrow(metadata, metadataJson, key, methodNameInError = "readMetadataJsonOrThrow") {
		const json = readMetadata(metadata, key);
		if (json === void 0) return void 0;
		const schema = metadataJson[key];
		try {
			const value = JSON.parse(json);
			return schema.parse(value);
		} catch (error) {
			throw new Error(`${methodNameInError} failed, key: ${String(key)}, value: ${json}, error: ${ensureError(error)}`);
		}
	}
	function readMetadataJson(metadata, metadataJson, key) {
		try {
			return readMetadataJsonOrThrow(metadata, metadataJson, key);
		} catch {
			return;
		}
	}
	const Annotation = {
		AxisNature: "pl7.app/axisNature",
		Alphabet: "pl7.app/alphabet",
		Description: "pl7.app/description",
		DiscreteValues: "pl7.app/discreteValues",
		Format: "pl7.app/format",
		Graph: {
			Axis: {
				HighCardinality: "pl7.app/graph/axis/highCardinality",
				LowerLimit: "pl7.app/graph/axis/lowerLimit",
				SymmetricRange: "pl7.app/graph/axis/symmetricRange",
				UpperLimit: "pl7.app/graph/axis/upperLimit"
			},
			IsDenseAxis: "pl7.app/graph/isDenseAxis",
			IsVirtual: "pl7.app/graph/isVirtual",
			Palette: "pl7.app/graph/palette",
			Thresholds: "pl7.app/graph/thresholds",
			TreatAbsentValuesAs: "pl7.app/graph/treatAbsentValuesAs"
		},
		HideDataFromUi: "pl7.app/hideDataFromUi",
		HideDataFromGraphs: "pl7.app/hideDataFromGraphs",
		IsDiscreteFilter: "pl7.app/isDiscreteFilter",
		IsAnchor: "pl7.app/isAnchor",
		IsLinkerColumn: "pl7.app/isLinkerColumn",
		IsScore: "pl7.app/isScore",
		IsSubset: "pl7.app/isSubset",
		Label: "pl7.app/label",
		Max: "pl7.app/max",
		Min: "pl7.app/min",
		MultipliesBy: "pl7.app/multipliesBy",
		Parents: "pl7.app/parents",
		Score: {
			DefaultCutoff: "pl7.app/score/defaultCutoff",
			RankingOrder: "pl7.app/score/rankingOrder"
		},
		Sequence: {
			Annotation: { Mapping: "pl7.app/sequence/annotation/mapping" },
			IsAnnotation: "pl7.app/sequence/isAnnotation"
		},
		Table: {
			FontFamily: "pl7.app/table/fontFamily",
			OrderPriority: "pl7.app/table/orderPriority",
			Visibility: "pl7.app/table/visibility"
		},
		Trace: "pl7.app/trace",
		VDJ: {
			IsAssemblingFeature: "pl7.app/vdj/isAssemblingFeature",
			IsMainSequence: "pl7.app/vdj/isMainSequence"
		}
	};
	const ValueTypeSchema = enumType$1([
		"Int",
		"Long",
		"Float",
		"Double",
		"String"
	]);
	const AnnotationJson = {
		[Annotation.DiscreteValues]: arrayType$1(stringType$1()).or(arrayType$1(numberType$1())),
		[Annotation.Graph.Axis.HighCardinality]: booleanType$1(),
		[Annotation.Graph.Axis.LowerLimit]: numberType$1(),
		[Annotation.Graph.Axis.UpperLimit]: numberType$1(),
		[Annotation.Graph.Axis.SymmetricRange]: booleanType$1(),
		[Annotation.Graph.IsDenseAxis]: booleanType$1(),
		[Annotation.Graph.Palette]: objectType$1({
			mapping: recordType$1(numberType$1()),
			name: stringType$1()
		}),
		[Annotation.Graph.Thresholds]: arrayType$1(objectType$1({
			columnId: objectType$1({
				valueType: ValueTypeSchema,
				name: stringType$1()
			}),
			value: numberType$1()
		})),
		[Annotation.Graph.TreatAbsentValuesAs]: numberType$1(),
		[Annotation.Graph.IsVirtual]: booleanType$1(),
		[Annotation.HideDataFromUi]: booleanType$1(),
		[Annotation.HideDataFromGraphs]: booleanType$1(),
		[Annotation.IsDiscreteFilter]: booleanType$1(),
		[Annotation.IsLinkerColumn]: booleanType$1(),
		[Annotation.IsSubset]: booleanType$1(),
		[Annotation.Max]: numberType$1(),
		[Annotation.Min]: numberType$1(),
		[Annotation.MultipliesBy]: arrayType$1(stringType$1()),
		[Annotation.Parents]: arrayType$1(stringType$1()),
		[Annotation.Sequence.Annotation.Mapping]: recordType$1(stringType$1(), stringType$1()),
		[Annotation.Sequence.IsAnnotation]: booleanType$1(),
		[Annotation.Table.OrderPriority]: numberType$1(),
		[Annotation.Trace]: recordType$1(stringType$1(), unknownType$1()),
		[Annotation.VDJ.IsAssemblingFeature]: booleanType$1()
	};
	function readAnnotation(spec, key) {
		return readMetadata(spec?.annotations, key);
	}
	function readAnnotationJson(spec, key) {
		return readMetadataJson(spec?.annotations, AnnotationJson, key);
	}
	function isLinkerColumn(column) {
		return !!readAnnotationJson(column, Annotation.IsLinkerColumn);
	}
	function makeAxisTree(axis) {
		return {
			axis,
			children: []
		};
	}
	/** Build tree by axis parents annotations */
	function getAxesTree(rootAxis) {
		const root = makeAxisTree(rootAxis);
		let nodesQ = [root];
		while (nodesQ.length) {
			const nextNodes = [];
			for (const node of nodesQ) {
				node.children = node.axis.parentAxesSpec.map(makeAxisTree);
				nextNodes.push(...node.children);
			}
			nodesQ = nextNodes;
		}
		return root;
	}
	/** Get array of axisSpecs from axisTree */
	function getArrayFromAxisTree(tree) {
		const res = [tree.axis];
		let nodesQ = [tree];
		while (nodesQ.length) {
			const nextNodes = [];
			for (const node of nodesQ) for (const parent of node.children) {
				res.push(parent.axis);
				nextNodes.push(parent);
			}
			nodesQ = nextNodes;
		}
		return res;
	}
	function canonicalizeAxisWithParents(axis) {
		return canonicalizeJson(getArrayFromAxisTree(getAxesTree(axis)).map(getAxisId));
	}
	function normalizingAxesComparator(axis1, axis2) {
		if (axis1.name !== axis2.name) return axis1.name < axis2.name ? 1 : -1;
		if (axis1.type !== axis2.type) return axis1.type < axis2.type ? 1 : -1;
		const domain1 = canonicalizeJson(axis1.domain ?? {});
		const domain2 = canonicalizeJson(axis2.domain ?? {});
		if (domain1 !== domain2) return domain1 < domain2 ? 1 : -1;
		const contextDomain1 = canonicalizeJson(axis1.contextDomain ?? {});
		const contextDomain2 = canonicalizeJson(axis2.contextDomain ?? {});
		if (contextDomain1 !== contextDomain2) return contextDomain1 < contextDomain2 ? 1 : -1;
		const parents1 = canonicalizeAxisWithParents(axis1);
		const parents2 = canonicalizeAxisWithParents(axis2);
		if (parents1 !== parents2) return parents1 < parents2 ? 1 : -1;
		const annotation1 = canonicalizeJson(axis1.annotations ?? {});
		const annotation2 = canonicalizeJson(axis2.annotations ?? {});
		if (annotation1 !== annotation2) return annotation1 < annotation2 ? 1 : -1;
		return 0;
	}
	function parseParentsFromAnnotations(axis) {
		const parentsList = readAnnotationJson(axis, Annotation.Parents);
		if (parentsList === void 0) return [];
		return parentsList;
	}
	function sortParentsDeep(axisSpec) {
		axisSpec.parentAxesSpec.forEach(sortParentsDeep);
		axisSpec.parentAxesSpec.sort(normalizingAxesComparator);
	}
	function hasCycleOfParents(axisSpec) {
		let nodesQ = [makeAxisTree(axisSpec)];
		const ancestors = new Set(canonicalizeJson(getAxisId(axisSpec)));
		while (nodesQ.length) {
			const nextNodes = [];
			const levelIds = /* @__PURE__ */ new Set();
			for (const node of nodesQ) {
				node.children = node.axis.parentAxesSpec.map(makeAxisTree);
				for (const child of node.children) {
					const childId = canonicalizeJson(getAxisId(child.axis));
					if (!levelIds.has(childId)) {
						nextNodes.push(child);
						levelIds.add(childId);
						if (ancestors.has(childId)) return true;
						ancestors.add(childId);
					}
				}
			}
			nodesQ = nextNodes;
		}
		return false;
	}
	/** Create list of normalized axisSpec (parents are in array of specs, not indexes) */
	function getNormalizedAxesList(axes) {
		if (!axes.length) return [];
		const modifiedAxes = axes.map((axis) => {
			const { parentAxes: _, ...copiedRest } = axis;
			return {
				...copiedRest,
				annotations: { ...copiedRest.annotations },
				parentAxesSpec: []
			};
		});
		axes.forEach((axis, idx) => {
			const modifiedAxis = modifiedAxes[idx];
			if (axis.parentAxes) modifiedAxis.parentAxesSpec = axis.parentAxes.map((idx) => modifiedAxes[idx]);
			else {
				const parents = parseParentsFromAnnotations(axis).map((name) => modifiedAxes.find((axis) => axis.name === name));
				modifiedAxis.parentAxesSpec = parents.some((p) => p === void 0) ? [] : parents;
			}
		});
		if (modifiedAxes.some(hasCycleOfParents)) modifiedAxes.forEach((axis) => {
			axis.parentAxesSpec = [];
		});
		else modifiedAxes.forEach((axis) => {
			sortParentsDeep(axis);
		});
		return modifiedAxes;
	}
	const PColumnName = {
		Label: "pl7.app/label",
		Table: { RowSelection: "pl7.app/table/row-selection" },
		VDJ: {
			LeadSelection: "pl7.app/vdj/lead-selection",
			RankingOrder: "pl7.app/vdj/ranking-order",
			Sequence: "pl7.app/vdj/sequence"
		}
	};
	/** Get column id and spec from a column */
	function getColumnIdAndSpec(column) {
		return {
			columnId: column.id,
			spec: column.spec
		};
	}
	/** Extracts axis ids from axis spec */
	function getAxisId(spec) {
		const { type, name, domain, contextDomain } = spec;
		const result = {
			type,
			name
		};
		if (domain && Object.entries(domain).length > 0) Object.assign(result, { domain });
		if (contextDomain && Object.entries(contextDomain).length > 0) Object.assign(result, { contextDomain });
		return result;
	}
	/** Extracts axes ids from axes spec array from column spec */
	function getAxesId(spec) {
		return spec.map(getAxisId);
	}
	/** Canonicalizes axis id */
	function canonicalizeAxisId(id) {
		return canonicalizeJson(getAxisId(id));
	}
	/** Returns true if all domains from query are found in target */
	function matchDomain$1(query, target) {
		if (query === void 0) return target === void 0;
		if (target === void 0) return true;
		for (const k in target) if (query[k] !== target[k]) return false;
		return true;
	}
	/** Returns whether "match" axis id is compatible with the "query" */
	function matchAxisId(query, target) {
		return query.name === target.name && matchDomain$1(query.domain, target.domain) && matchDomain$1(query.contextDomain, target.contextDomain);
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/drivers/pframe/query/utils.js
	/**
	* Recursively traverses a SpecQuery tree bottom-up, applying visitor callbacks.
	*
	* Traversal order:
	* 1. Recurse into child queries
	* 2. Apply `column` to transform column references in leaf nodes
	* 3. Apply `joinEntry` to each join entry (with inner query already traversed)
	* 4. Assemble node with transformed children
	* 5. Apply `node` to the assembled node
	*/
	function traverseQuerySpec(query, visitor) {
		const traverseEntry = (entry) => {
			const traversed = {
				...entry,
				entry: traverseQuerySpec(entry.entry, visitor)
			};
			return visitor.joinEntry ? visitor.joinEntry(traversed) : traversed;
		};
		let result;
		switch (query.type) {
			case "column":
				result = {
					type: "column",
					column: visitor.column(query.column)
				};
				break;
			case "sparseToDenseColumn":
				result = {
					...query,
					column: visitor.column(query.column)
				};
				break;
			case "inlineColumn":
				result = query;
				break;
			case "innerJoin":
			case "fullJoin":
				result = {
					...query,
					entries: query.entries.map(traverseEntry)
				};
				break;
			case "outerJoin":
				result = {
					...query,
					primary: traverseEntry(query.primary),
					secondary: query.secondary.map(traverseEntry)
				};
				break;
			case "filter":
			case "sort":
			case "sliceAxes":
				result = {
					...query,
					input: traverseQuerySpec(query.input, visitor)
				};
				break;
			default: assertNever(query);
		}
		return visitor.node ? visitor.node(result) : result;
	}
	/** Recursively maps all column references in a SpecQuery tree. */
	function mapSpecQueryColumns(query, cb) {
		return traverseQuerySpec(query, { column: cb });
	}
	/** Collects all column references from a SpecQuery tree. */
	function collectSpecQueryColumns(query) {
		const result = [];
		traverseQuerySpec(query, { column: (c) => {
			result.push(c);
			return c;
		} });
		return result;
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/drivers/pframe/table_calculate.js
	function mapPTableDef(def, cb) {
		return {
			...def,
			src: mapJoinEntry(def.src, cb)
		};
	}
	function mapPTableDefV2(def, cb) {
		return { query: mapSpecQueryColumns(def.query, cb) };
	}
	function mapJoinEntry(entry, cb) {
		switch (entry.type) {
			case "column": return {
				type: "column",
				column: cb(entry.column)
			};
			case "slicedColumn": return {
				type: "slicedColumn",
				column: cb(entry.column),
				newId: entry.newId,
				axisFilters: entry.axisFilters
			};
			case "artificialColumn": return {
				type: "artificialColumn",
				column: cb(entry.column),
				newId: entry.newId,
				axesIndices: entry.axesIndices
			};
			case "inlineColumn": return entry;
			case "inner":
			case "full": return {
				type: entry.type,
				entries: entry.entries.map((col) => mapJoinEntry(col, cb))
			};
			case "outer": return {
				type: "outer",
				primary: mapJoinEntry(entry.primary, cb),
				secondary: entry.secondary.map((col) => mapJoinEntry(col, cb))
			};
			default: assertNever(entry);
		}
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/drivers/pframe/spec/ids.js
	/**
	* Canonically serializes a {@link UniversalPColumnId} to a string.
	* @param id - The column identifier to serialize
	* @returns The canonically serialized string
	*/
	function stringifyColumnId(id) {
		return (0, import_canonicalize.default)(id);
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/drivers/pframe/spec/anchored.js
	function axisKey(axis) {
		return (0, import_canonicalize.default)(getAxisId(axis));
	}
	function domainKey(key, value) {
		return JSON.stringify([key, value]);
	}
	/**
	* Context for resolving and generating anchored references to columns and axes
	* Maintains maps of known domain values and axes that can be referenced by anchors
	*/
	var AnchoredIdDeriver = class {
		domains = /* @__PURE__ */ new Map();
		contextDomains = /* @__PURE__ */ new Map();
		axes = /* @__PURE__ */ new Map();
		/**
		* Domain packs are used to group domain keys that can be anchored to the same anchor
		* This is used to optimize the lookup of domain anchors
		*/
		domainPacks = [];
		contextDomainPacks = [];
		/**
		* Maps domain packs to anchors
		*/
		domainPackToAnchor = /* @__PURE__ */ new Map();
		contextDomainPackToAnchor = /* @__PURE__ */ new Map();
		/**
		* Creates a new anchor context from a set of anchor column specifications
		* @param anchors Record of anchor column specifications indexed by anchor ID
		*/
		constructor(anchors) {
			this.anchors = anchors;
			const anchorEntries = Object.entries(anchors);
			anchorEntries.sort((a, b) => a[0].localeCompare(b[0]));
			for (const [anchorId, spec] of anchorEntries) {
				for (let axisIdx = 0; axisIdx < spec.axesSpec.length; axisIdx++) {
					const axis = spec.axesSpec[axisIdx];
					const key = axisKey(axis);
					this.axes.set(key, {
						anchor: anchorId,
						idx: axisIdx
					});
				}
				if (spec.domain !== void 0) {
					const domainEntries = Object.entries(spec.domain);
					domainEntries.sort((a, b) => a[0].localeCompare(b[0]));
					this.domainPackToAnchor.set(JSON.stringify(domainEntries), anchorId);
					this.domainPacks.push(domainEntries.map(([dKey]) => dKey));
					for (const [dKey, dValue] of domainEntries) {
						const key = domainKey(dKey, dValue);
						this.domains.set(key, anchorId);
					}
				}
				if (spec.contextDomain !== void 0) {
					const contextDomainEntries = Object.entries(spec.contextDomain);
					contextDomainEntries.sort((a, b) => a[0].localeCompare(b[0]));
					this.contextDomainPackToAnchor.set(JSON.stringify(contextDomainEntries), anchorId);
					this.contextDomainPacks.push(contextDomainEntries.map(([dKey]) => dKey));
					for (const [dKey, dValue] of contextDomainEntries) {
						const key = domainKey(dKey, dValue);
						this.contextDomains.set(key, anchorId);
					}
				}
			}
		}
		/**
		* Implementation of derive method
		*/
		derive(spec, axisFilters) {
			const result = {
				name: spec.name,
				axes: []
			};
			let skipDomains = void 0;
			if (spec.domain !== void 0) outer: for (const domainPack of this.domainPacks) {
				const dAnchor = [];
				for (const domainKey of domainPack) {
					const dValue = spec.domain[domainKey];
					if (dValue !== void 0) dAnchor.push([domainKey, dValue]);
					else break outer;
				}
				const domainAnchor = this.domainPackToAnchor.get(JSON.stringify(dAnchor));
				if (domainAnchor !== void 0) {
					result.domainAnchor = domainAnchor;
					skipDomains = new Set(domainPack);
					break;
				}
			}
			for (const [dKey, dValue] of Object.entries(spec.domain ?? {})) {
				if (skipDomains !== void 0 && skipDomains.has(dKey)) continue;
				const key = domainKey(dKey, dValue);
				const anchorId = this.domains.get(key);
				result.domain ??= {};
				result.domain[dKey] = anchorId ? { anchor: anchorId } : dValue;
			}
			let skipContextDomains = void 0;
			if (spec.contextDomain !== void 0) outer: for (const contextDomainPack of this.contextDomainPacks) {
				const dAnchor = [];
				for (const domainKey of contextDomainPack) {
					const dValue = spec.contextDomain[domainKey];
					if (dValue !== void 0) dAnchor.push([domainKey, dValue]);
					else break outer;
				}
				const contextDomainAnchor = this.contextDomainPackToAnchor.get(JSON.stringify(dAnchor));
				if (contextDomainAnchor !== void 0) {
					result.contextDomainAnchor = contextDomainAnchor;
					skipContextDomains = new Set(contextDomainPack);
					break;
				}
			}
			for (const [dKey, dValue] of Object.entries(spec.contextDomain ?? {})) {
				if (skipContextDomains !== void 0 && skipContextDomains.has(dKey)) continue;
				const key = domainKey(dKey, dValue);
				const anchorId = this.contextDomains.get(key);
				result.contextDomain ??= {};
				result.contextDomain[dKey] = anchorId ? { anchor: anchorId } : dValue;
			}
			result.axes = spec.axesSpec.map((axis) => {
				const key = axisKey(axis);
				const anchorAxisRef = this.axes.get(key);
				if (anchorAxisRef === void 0) return getAxisId(axis);
				else return anchorAxisRef;
			});
			if (!axisFilters || axisFilters.length === 0) return result;
			const resolvedFilters = [];
			for (const filter of axisFilters) {
				const [axisIdOrIndex, value] = filter;
				if (typeof axisIdOrIndex === "number") {
					if (axisIdOrIndex < 0 || axisIdOrIndex >= spec.axesSpec.length) throw new Error(`Axis index ${axisIdOrIndex} is out of bounds (0-${spec.axesSpec.length - 1})`);
					resolvedFilters.push([axisIdOrIndex, value]);
				} else {
					const axisIndex = spec.axesSpec.findIndex((axis) => axis.name === axisIdOrIndex);
					if (axisIndex === -1) throw new Error(`Axis with name "${axisIdOrIndex}" not found in the column specification`);
					resolvedFilters.push([axisIndex, value]);
				}
			}
			resolvedFilters.sort((a, b) => a[0] - b[0]);
			return {
				source: result,
				axisFilters: resolvedFilters
			};
		}
		/**
		* Derives a canonicalized string representation of an anchored column identifier, can be used as a unique identifier for the column
		* @param spec Column specification to anchor
		* @param axisFilters Optional axis filters to apply to the column
		* @returns A canonicalized string representation of the anchored column identifier
		*/
		deriveS(spec, axisFilters) {
			return stringifyColumnId(this.derive(spec, axisFilters));
		}
	};
	/**
	* Resolves anchored references in a column matcher to create a non-anchored matcher.
	* Doing an opposite operation to {@link AnchorIdDeriver.derive()}.
	*
	* @param anchors - Record of anchor column specifications indexed by anchor id
	* @param matcher - An anchored column matcher (or id, which is subtype of it) containing references that need to be resolved
	* @param options - Options for resolving anchors
	* @returns A non-anchored column matcher with all references resolved to actual values
	*/
	function resolveAnchors(anchors, matcher, options) {
		const result = { ...matcher };
		const ignoreMissingDomains = options?.ignoreMissingDomains ?? false;
		if (result.domainAnchor !== void 0) {
			const anchorSpec = anchors[result.domainAnchor];
			if (!anchorSpec) throw new Error(`Anchor "${result.domainAnchor}" not found`);
			result.domain = {
				...anchorSpec.domain || {},
				...result.domain
			};
			delete result.domainAnchor;
		}
		if (result.domain) {
			const resolvedDomain = {};
			for (const [key, value] of Object.entries(result.domain)) if (typeof value === "string") resolvedDomain[key] = value;
			else {
				const anchorSpec = anchors[value.anchor];
				if (!anchorSpec) throw new Error(`Anchor "${value.anchor}" not found for domain key "${key}"`);
				if (!anchorSpec.domain || anchorSpec.domain[key] === void 0) {
					if (!ignoreMissingDomains) throw new Error(`Domain key "${key}" not found in anchor "${value.anchor}"`);
					continue;
				}
				resolvedDomain[key] = anchorSpec.domain[key];
			}
			result.domain = resolvedDomain;
		}
		if (result.contextDomainAnchor !== void 0) {
			const anchorSpec = anchors[result.contextDomainAnchor];
			if (!anchorSpec) throw new Error(`Anchor "${result.contextDomainAnchor}" not found`);
			result.contextDomain = {
				...anchorSpec.contextDomain || {},
				...result.contextDomain
			};
			delete result.contextDomainAnchor;
		}
		if (result.contextDomain) {
			const resolvedContextDomain = {};
			for (const [key, value] of Object.entries(result.contextDomain)) if (typeof value === "string") resolvedContextDomain[key] = value;
			else {
				const anchorSpec = anchors[value.anchor];
				if (!anchorSpec) throw new Error(`Anchor "${value.anchor}" not found for contextDomain key "${key}"`);
				if (!anchorSpec.contextDomain || anchorSpec.contextDomain[key] === void 0) {
					if (!ignoreMissingDomains) throw new Error(`Context domain key "${key}" not found in anchor "${value.anchor}"`);
					continue;
				}
				resolvedContextDomain[key] = anchorSpec.contextDomain[key];
			}
			result.contextDomain = resolvedContextDomain;
		}
		if (result.axes) result.axes = result.axes.map((axis) => resolveAxisReference(anchors, axis));
		return result;
	}
	/**
	* Resolves an anchored axis reference to a concrete AxisId
	*/
	function resolveAxisReference(anchors, axisRef) {
		if (!isAnchorAxisRef(axisRef)) return axisRef;
		const anchorId = axisRef.anchor;
		const anchorSpec = anchors[anchorId];
		if (!anchorSpec) throw new Error(`Anchor "${anchorId}" not found for axis reference`);
		if ("idx" in axisRef) {
			if (axisRef.idx < 0 || axisRef.idx >= anchorSpec.axesSpec.length) throw new Error(`Axis index ${axisRef.idx} out of bounds for anchor "${anchorId}"`);
			return anchorSpec.axesSpec[axisRef.idx];
		} else if ("name" in axisRef) {
			const matches = anchorSpec.axesSpec.filter((axis) => axis.name === axisRef.name);
			if (matches.length > 1) throw new Error(`Multiple axes with name "${axisRef.name}" found in anchor "${anchorId}"`);
			if (matches.length === 0) throw new Error(`Axis with name "${axisRef.name}" not found in anchor "${anchorId}"`);
			return matches[0];
		} else if ("id" in axisRef) {
			const matches = anchorSpec.axesSpec.filter((axis) => matchAxisId(axisRef.id, getAxisId(axis)));
			if (matches.length > 1) throw new Error(`Multiple matching axes found for matcher in anchor "${anchorId}"`);
			if (matches.length === 0) throw new Error(`No matching axis found for matcher in anchor "${anchorId}"`);
			return matches[0];
		}
		throw new Error(`Unsupported axis reference type`);
	}
	/**
	* Type guard to check if a value is an anchored axis reference
	*/
	function isAnchorAxisRef(value) {
		return typeof value === "object" && "anchor" in value;
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/pool/spec.js
	function isPColumnSpec(spec) {
		return spec.kind === "PColumn";
	}
	function isPColumn(obj) {
		return isPColumnSpec(obj.spec);
	}
	function ensurePColumn(obj) {
		if (!isPColumn(obj)) throw new Error(`not a PColumn (kind = ${obj.spec.kind})`);
		return obj;
	}
	function mapPObjectData(pObj, cb) {
		return pObj === void 0 ? void 0 : {
			...pObj,
			data: cb(typeof pObj.data === "function" ? pObj.data() : pObj.data)
		};
	}
	function extractAllColumns(entry) {
		const columns = /* @__PURE__ */ new Map();
		const addAllColumns = (entry) => {
			switch (entry.type) {
				case "column":
					columns.set(entry.column.id, entry.column);
					return;
				case "slicedColumn":
					columns.set(entry.column.id, entry.column);
					return;
				case "artificialColumn":
					columns.set(entry.column.id, entry.column);
					return;
				case "inlineColumn": return;
				case "full":
				case "inner":
					for (const e of entry.entries) addAllColumns(e);
					return;
				case "outer":
					addAllColumns(entry.primary);
					for (const e of entry.secondary) addAllColumns(e);
					return;
				default: assertNever(entry);
			}
		};
		addAllColumns(entry);
		return [...columns.values()];
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/drivers/pframe/spec/selectors.js
	/**
	* Determines if an axis ID matches an axis selector.
	*
	* @param selector - The selector with criteria to match against
	* @param axis - The AxisId to check against the selector
	* @returns true if the AxisId matches all specified criteria in the selector, false otherwise
	*/
	function matchAxis(selector, axis) {
		if (selector.name !== void 0 && selector.name !== axis.name) return false;
		if (selector.type !== void 0) {
			if (Array.isArray(selector.type)) {
				if (!selector.type.includes(axis.type)) return false;
			} else if (selector.type !== axis.type) return false;
		}
		if (selector.domain !== void 0) {
			const axisDomain = axis.domain || {};
			for (const [key, value] of Object.entries(selector.domain)) if (axisDomain[key] !== value) return false;
		}
		if (selector.contextDomain !== void 0) {
			const axisContextDomain = axis.contextDomain || {};
			for (const [key, value] of Object.entries(selector.contextDomain)) if (axisContextDomain[key] !== value) return false;
		}
		return true;
	}
	/**
	* Determines if a given PColumnSpec matches a selector.
	*
	* @param pcolumn - The PColumnSpec to check against the selector
	* @param selector - The selector criteria to match against
	* @returns true if the PColumnSpec matches all criteria in the selector, false otherwise
	*/
	function matchPColumn(pcolumn, selector) {
		if (selector.name !== void 0 && pcolumn.name !== selector.name) return false;
		if (selector.namePattern !== void 0 && !new RegExp(selector.namePattern).test(pcolumn.name)) return false;
		if (selector.type !== void 0) {
			if (Array.isArray(selector.type)) {
				if (!selector.type.includes(pcolumn.valueType)) return false;
			} else if (selector.type !== pcolumn.valueType) return false;
		}
		if (selector.domain !== void 0) {
			const columnDomain = pcolumn.domain || {};
			for (const [key, value] of Object.entries(selector.domain)) if (columnDomain[key] !== value) return false;
		}
		if (selector.contextDomain !== void 0) {
			const columnContextDomain = pcolumn.contextDomain || {};
			for (const [key, value] of Object.entries(selector.contextDomain)) if (columnContextDomain[key] !== value) return false;
		}
		if (selector.axes !== void 0) {
			const pcolumnAxes = pcolumn.axesSpec.map(getAxisId);
			if (selector.partialAxesMatch) {
				for (const selectorAxis of selector.axes) if (!pcolumnAxes.some((columnAxis) => matchAxis(selectorAxis, columnAxis))) return false;
			} else {
				if (pcolumnAxes.length !== selector.axes.length) return false;
				for (let i = 0; i < selector.axes.length; i++) if (!matchAxis(selector.axes[i], pcolumnAxes[i])) return false;
			}
		}
		if (selector.annotations !== void 0) {
			const columnAnnotations = pcolumn.annotations || {};
			for (const [key, value] of Object.entries(selector.annotations)) if (columnAnnotations[key] !== value) return false;
		}
		if (selector.annotationPatterns !== void 0) {
			const columnAnnotations = pcolumn.annotations || {};
			for (const [key, pattern] of Object.entries(selector.annotationPatterns)) {
				const value = columnAnnotations[key];
				if (value === void 0 || !new RegExp(pattern).test(value)) return false;
			}
		}
		return true;
	}
	/**
	* Convert a predicate or array of selectors to a single predicate function
	* @param predicateOrSelectors - Either a function that takes a PColumnSpec and returns a boolean,
	*                              or an array of PColumnSelectors, or a single PColumnSelector
	* @returns A function that takes a PColumnSpec and returns a boolean
	*/
	function legacyColumnSelectorsToPredicate(predicateOrSelectors) {
		if (Array.isArray(predicateOrSelectors)) return (spec) => predicateOrSelectors.some((selector) => isPColumnSpec(spec) && matchPColumn(spec, selector));
		else return (spec) => isPColumnSpec(spec) && matchPColumn(spec, predicateOrSelectors);
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/drivers/pframe/spec/native_id.js
	function deriveNativeId(spec) {
		const result = {
			kind: spec.kind,
			name: spec.name
		};
		if (spec.domain !== void 0) result.domain = spec.domain;
		if (spec.contextDomain !== void 0) result.contextDomain = spec.contextDomain;
		if (isPColumnSpec(spec)) result.axesSpec = getAxesId(spec.axesSpec);
		return (0, import_canonicalize.default)(result);
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/drivers/pframe/linker_columns.js
	var LinkerMap = class LinkerMap {
		/** Graph of linkers connected by axes (single or grouped by parents) */
		data;
		constructor(linkerMap) {
			this.data = linkerMap;
		}
		get keys() {
			return this.data.keys();
		}
		get keyAxesIds() {
			return [...this.data.keys()].map(parseJson);
		}
		static fromColumns(columns) {
			const result = /* @__PURE__ */ new Map();
			for (const linker of columns.filter((l) => !!readAnnotationJson(l.spec, Annotation.IsLinkerColumn))) {
				const groups = LinkerMap.getAxesGroups(getNormalizedAxesList(linker.spec.axesSpec));
				if (groups.length !== 2) continue;
				const [left, right] = groups;
				const leftKeyVariants = LinkerMap.getAxesRoots(left).map((axis) => {
					const axes = getArrayFromAxisTree(getAxesTree(axis));
					return [canonicalizeJson(axes.map(getAxisId)), axes];
				});
				const rightKeyVariants = LinkerMap.getAxesRoots(right).map((axis) => {
					const axes = getArrayFromAxisTree(getAxesTree(axis));
					return [canonicalizeJson(axes.map(getAxisId)), axes];
				});
				for (const [keyLeft, spec] of leftKeyVariants) if (!result.has(keyLeft)) result.set(keyLeft, {
					keyAxesSpec: spec,
					linkWith: /* @__PURE__ */ new Map()
				});
				for (const [keyRight, spec] of rightKeyVariants) if (!result.has(keyRight)) result.set(keyRight, {
					keyAxesSpec: spec,
					linkWith: /* @__PURE__ */ new Map()
				});
				for (const [keyLeft] of leftKeyVariants) for (const [keyRight] of rightKeyVariants) result.get(keyLeft)?.linkWith.set(keyRight, linker);
			}
			return new this(result);
		}
		/** Get all available nodes of linker graphs if start from sourceAxesKeys */
		searchAvailableAxesKeys(sourceAxesKeys) {
			const startKeys = new Set(sourceAxesKeys);
			const allAvailableKeys = /* @__PURE__ */ new Set();
			let nextKeys = sourceAxesKeys;
			while (nextKeys.length) {
				const next = [];
				for (const key of nextKeys) {
					const node = this.data.get(key);
					if (!node) continue;
					for (const availableKey of node.linkWith.keys()) if (!allAvailableKeys.has(availableKey) && !startKeys.has(availableKey)) {
						next.push(availableKey);
						allAvailableKeys.add(availableKey);
					}
				}
				nextKeys = next;
			}
			return allAvailableKeys;
		}
		/** Get all linker columns that are necessary to reach endKey from startKey */
		searchLinkerPath(startKey, endKey) {
			const previous = {};
			let nextIds = new Set([startKey]);
			const visited = new Set([startKey]);
			while (nextIds.size) {
				const next = /* @__PURE__ */ new Set();
				for (const nextId of nextIds) {
					const node = this.data.get(nextId);
					if (!node) continue;
					for (const availableId of node.linkWith.keys()) {
						previous[availableId] = nextId;
						if (availableId === endKey) {
							const ids = [];
							let current = endKey;
							while (previous[current] !== startKey) {
								ids.push(current);
								current = previous[current];
							}
							ids.push(current);
							return ids.map((id) => this.data.get(previous[id]).linkWith.get(id));
						} else if (!visited.has(availableId)) {
							next.add(availableId);
							visited.add(availableId);
						}
					}
				}
				nextIds = next;
			}
			return [];
		}
		getLinkerColumnsForAxes({ from: sourceAxes, to: targetAxes, throwWhenNoLinkExists = true }) {
			const startKeys = sourceAxes.map(LinkerMap.getLinkerKeyFromAxisSpec);
			return Array.from(new Map(LinkerMap.getAxesRoots(targetAxes).map(LinkerMap.getLinkerKeyFromAxisSpec).flatMap((targetKey) => {
				const linkers = startKeys.map((startKey) => this.searchLinkerPath(startKey, targetKey)).reduce((shortestPath, path) => shortestPath.length && shortestPath.length < path.length || !path.length ? shortestPath : path, []).map((linker) => [linker.columnId, linker]);
				if (!linkers.length && throwWhenNoLinkExists) throw Error(`Unable to find linker column for ${targetKey}`);
				return linkers;
			})).values());
		}
		/** Get list of axisSpecs from keys of linker columns map  */
		getAxesListFromKeysList(keys) {
			return Array.from(new Map(keys.flatMap((key) => this.data.get(key)?.keyAxesSpec ?? []).map((axis) => [canonicalizeJson(getAxisId(axis)), axis])).values());
		}
		/** Get axes of target axes that are impossible to be linked to source axes with current linker map */
		getNonLinkableAxes(sourceAxes, targetAxes) {
			const startKeys = sourceAxes.map(LinkerMap.getLinkerKeyFromAxisSpec);
			const targetKeys = targetAxes.map(LinkerMap.getLinkerKeyFromAxisSpec);
			return Array.from(new Map(targetAxes.filter((_targetAxis, idx) => {
				const targetKey = targetKeys[idx];
				return !startKeys.some((startKey) => this.searchLinkerPath(startKey, targetKey).length);
			}).flatMap((axis) => getArrayFromAxisTree(getAxesTree(axis)).map((axis) => [canonicalizeJson(getAxisId(axis)), axis]))).values());
		}
		/** Get all axes that can be connected to sourceAxes by linkers */
		getReachableByLinkersAxesFromAxesNormalized(sourceAxes, matchAxisIdFn) {
			let startKeys = [];
			if (matchAxisIdFn) {
				const sourceAxisIdsGrouped = sourceAxes.map((axis) => getArrayFromAxisTree(getAxesTree(axis)).map(getAxisId));
				for (const sourceAxisIdsGroup of sourceAxisIdsGrouped) {
					const matched = this.keyAxesIds.find((keyIds) => keyIds.every((linkerKeyAxisId) => sourceAxisIdsGroup.find((sourceAxisId) => matchAxisIdFn(linkerKeyAxisId, sourceAxisId))));
					if (matched) startKeys.push(canonicalizeJson(matched));
				}
			} else startKeys = sourceAxes.map(LinkerMap.getLinkerKeyFromAxisSpec);
			const availableKeys = this.searchAvailableAxesKeys(startKeys);
			return this.getAxesListFromKeysList([...availableKeys]);
		}
		getReachableByLinkersAxesFromAxes(sourceAxes, matchAxisIdFn) {
			return this.getReachableByLinkersAxesFromAxesNormalized(getNormalizedAxesList(sourceAxes), matchAxisIdFn);
		}
		static getLinkerKeyFromAxisSpec(axis) {
			return canonicalizeJson(getArrayFromAxisTree(getAxesTree(axis)).map(getAxisId));
		}
		/**  Split array of axes into several arrays by parents: axes of one group are parents for each other.
		There are no order inside every group. */
		static getAxesGroups(axesSpec) {
			switch (axesSpec.length) {
				case 0: return [];
				case 1: return [[axesSpec[0]]];
				default: break;
			}
			const axisKeys = axesSpec.map((spec) => canonicalizeJson(getAxisId(spec)));
			const axisParentsIdxs = axesSpec.map((spec) => new Set(spec.parentAxesSpec.map((spec) => canonicalizeJson(getAxisId(spec))).map((el) => {
				const idx = axisKeys.indexOf(el);
				if (idx === -1) throw new Error(`malformed axesSpec: ${JSON.stringify(axesSpec)}, unable to locate parent ${el}`);
				return idx;
			})));
			const allIdxs = [...axesSpec.keys()];
			const groups = [];
			const usedIdxs = /* @__PURE__ */ new Set();
			let nextFreeEl = allIdxs.find((idx) => !usedIdxs.has(idx));
			while (nextFreeEl !== void 0) {
				const currentGroup = [nextFreeEl];
				usedIdxs.add(nextFreeEl);
				let nextElsOfCurrentGroup = [nextFreeEl];
				while (nextElsOfCurrentGroup.length) {
					const next = /* @__PURE__ */ new Set();
					for (const groupIdx of nextElsOfCurrentGroup) {
						const groupElementParents = axisParentsIdxs[groupIdx];
						allIdxs.forEach((idx) => {
							if (idx === groupIdx || usedIdxs.has(idx)) return;
							if (axisParentsIdxs[idx].has(groupIdx) || groupElementParents.has(idx)) {
								currentGroup.push(idx);
								next.add(idx);
								usedIdxs.add(idx);
							}
						});
					}
					nextElsOfCurrentGroup = [...next];
				}
				groups.push([...currentGroup]);
				nextFreeEl = allIdxs.find((idx) => !usedIdxs.has(idx));
			}
			return groups.map((group) => group.map((idx) => axesSpec[idx]));
		}
		/** Get all axes that are not parents of any other axis */
		static getAxesRoots(axes) {
			const parentsSet = new Set(axes.flatMap((axis) => axis.parentAxesSpec).map((spec) => canonicalizeJson(getAxisId(spec))));
			return axes.filter((axis) => !parentsSet.has(canonicalizeJson(getAxisId(axis))));
		}
	};
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/drivers/pframe/driver.js
	function assert() {}
	assert();
	stringType$1().length(24).regex(/[ABCDEFGHIJKLMNOPQRSTUVWXYZ234567]/).brand("PlId");
	objectType$1({
		__isRef: literalType$1(true).describe("Crucial marker for the block dependency tree reconstruction"),
		blockId: stringType$1().describe("Upstream block id"),
		name: stringType$1().describe("Name of the output provided to the upstream block's output context"),
		requireEnrichments: literalType$1(true).optional().describe("True if current block that stores this reference in its args, may need enrichments for the references value originating from the blocks in between current and referenced block")
	}).describe("Universal reference type, allowing to set block connections. It is crucial that {@link __isRef} is present and equal to true, internal logic relies on this marker to build block dependency trees.").readonly();
	/**
	* Type guard to check if a value is a PlRef.
	*
	* @param value - The value to check.
	* @returns True if the value is a PlRef, false otherwise.
	*/
	function isPlRef(value) {
		return typeof value === "object" && value !== null && "__isRef" in value && value.__isRef === true && "blockId" in value && "name" in value;
	}
	/**
	* Creates a new PlRef based on an existing one, explicitly setting (default) or removing the
	* requireEnrichments property.
	*
	* @param ref - The original PlRef object.
	* @param requireEnrichments - If true, the `requireEnrichments: true` property is added
	*   to the returned PlRef. If false, the `requireEnrichments` property is removed. Defaults to true.
	* @returns A new PlRef object with the `requireEnrichments` property set or removed accordingly.
	*/
	function withEnrichments(ref, requireEnrichments = true) {
		if (requireEnrichments) return {
			...ref,
			requireEnrichments: true
		};
		else {
			const { requireEnrichments: _, ...rest } = ref;
			return rest;
		}
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/value_or_error.js
	function mapValueInVOE(voe, cb) {
		return voe.ok ? {
			ok: true,
			value: cb(voe.value)
		} : voe;
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/services/service_types.js
	const SERVICE_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/;
	const { service, isNodeService } = (() => {
		const typeMap = /* @__PURE__ */ new Map();
		return {
			service() {
				return (options) => {
					const { name, type } = options;
					if (!SERVICE_ID_PATTERN.test(name)) throw new ServiceInvalidIdError(`Invalid service ID "${name}": must match ${SERVICE_ID_PATTERN}`);
					if (typeMap.has(name)) throw new ServiceAlreadyRegisteredError(`Service "${name}" already registered`);
					typeMap.set(name, type);
					return name;
				};
			},
			isNodeService(id) {
				return typeMap.get(id) === "node";
			}
		};
	})();
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/services/service_declarations.js
	const Services = {
		PFrameSpec: service()({
			type: "wasm",
			name: "pframeSpec"
		}),
		PFrame: service()({
			type: "node",
			name: "pframe"
		})
	};
	Object.keys(Services).map((key) => `requires${key}`);
	/**
	* Resolve which services are required by the given feature flags.
	* Accepts Record<string, unknown> so it works with both BlockCodeKnownFeatureFlags
	* (from middle layer) and Zod-parsed records (from preload).
	*/
	function resolveRequiredServices(flags) {
		if (!flags) return [];
		return Object.keys(Services).filter((key) => flags[`requires${key}`] === true).map((key) => Services[key]);
	}
	Object.fromEntries(Object.keys(Services).map((key) => [`requires${key}`, true]));
	/** Introspect method names on an instance (including prototype chain).
	*  Uses Object.getOwnPropertyDescriptor to avoid triggering getters. */
	function getMethodNames(instance) {
		const methods = /* @__PURE__ */ new Set();
		let proto = instance;
		while (proto && proto !== Object.prototype) {
			for (const key of Object.getOwnPropertyNames(proto)) if (key !== "constructor" && typeof Object.getOwnPropertyDescriptor(proto, key)?.value === "function") methods.add(key);
			proto = Object.getPrototypeOf(proto);
		}
		return [...methods];
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+pl-model-common@1.31.2/node_modules/@milaboratories/pl-model-common/dist/services/service_injector_factory.js
	function createUiServiceInjectors(driverKit) {
		const { pFrameDriver } = driverKit;
		return { PFrame: {
			findColumns: (handle, request) => pFrameDriver.findColumns(handle, request),
			getColumnSpec: (handle, columnId) => pFrameDriver.getColumnSpec(handle, columnId),
			listColumns: (handle) => pFrameDriver.listColumns(handle),
			calculateTableData: (handle, request, range) => pFrameDriver.calculateTableData(handle, request, range),
			getUniqueValues: (handle, request) => pFrameDriver.getUniqueValues(handle, request),
			getShape: (handle) => pFrameDriver.getShape(handle),
			getSpec: (handle) => pFrameDriver.getSpec(handle),
			getData: (handle, columnIndices, range) => pFrameDriver.getData(handle, columnIndices, range)
		} };
	}
	(() => {
		const injectors = createUiServiceInjectors(new Proxy({}, { get: () => new Proxy({}, { get: () => () => {} }) }));
		const result = {};
		for (const key of Object.keys(Services)) {
			const serviceId = Services[key];
			const injector = injectors[key];
			result[serviceId] = injector ? getMethodNames(injector) : [];
		}
		return result;
	})();
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/render/accessor.js
	function ifDef(value, cb) {
		return value === void 0 ? void 0 : cb(value);
	}
	/** Represent resource tree node accessor */
	var TreeNodeAccessor = class TreeNodeAccessor {
		constructor(handle, resolvePath) {
			this.handle = handle;
			this.resolvePath = resolvePath;
		}
		resolve(...steps) {
			const transformedSteps = steps.map((s) => ({
				assertFieldType: "Input",
				...typeof s === "string" ? { field: s } : s
			}));
			return this.resolveWithCommon({}, ...transformedSteps);
		}
		resolveOutput(...steps) {
			const transformedSteps = steps.map((s) => ({
				assertFieldType: "Output",
				...typeof s === "string" ? { field: s } : s
			}));
			return this.resolveWithCommon({}, ...transformedSteps);
		}
		resolveInput(...steps) {
			const transformedSteps = steps.map((s) => ({
				assertFieldType: "Input",
				...typeof s === "string" ? { field: s } : s
			}));
			return this.resolveWithCommon({}, ...transformedSteps);
		}
		resolveAny(...steps) {
			return this.resolveWithCommon({}, ...steps);
		}
		resolveWithCommon(commonOptions, ...steps) {
			const resolvePath = [...this.resolvePath, ...steps.map((step) => typeof step === "string" ? step : step.field)];
			return ifDef(getCfgRenderCtx().resolveWithCommon(this.handle, commonOptions, ...steps), (accessor) => new TreeNodeAccessor(accessor, resolvePath));
		}
		get resourceType() {
			return getCfgRenderCtx().getResourceType(this.handle);
		}
		getInputsLocked() {
			return getCfgRenderCtx().getInputsLocked(this.handle);
		}
		getOutputsLocked() {
			return getCfgRenderCtx().getOutputsLocked(this.handle);
		}
		getIsReadyOrError() {
			return getCfgRenderCtx().getIsReadyOrError(this.handle);
		}
		getIsFinal() {
			return getCfgRenderCtx().getIsFinal(this.handle);
		}
		getError() {
			const resolvePath = [...this.resolvePath, "error"];
			return ifDef(getCfgRenderCtx().getError(this.handle), (accsessor) => new TreeNodeAccessor(accsessor, resolvePath));
		}
		listInputFields() {
			return getCfgRenderCtx().listInputFields(this.handle);
		}
		listOutputFields() {
			return getCfgRenderCtx().listOutputFields(this.handle);
		}
		listDynamicFields() {
			return getCfgRenderCtx().listDynamicFields(this.handle);
		}
		getKeyValueBase64(key) {
			return getCfgRenderCtx().getKeyValueBase64(this.handle, key);
		}
		getKeyValueAsString(key) {
			return getCfgRenderCtx().getKeyValueAsString(this.handle, key);
		}
		getKeyValueAsJson(key) {
			const content = this.getKeyValueAsString(key);
			if (content == void 0) throw new Error("Resource has no content.");
			return JSON.parse(content);
		}
		getDataBase64() {
			return getCfgRenderCtx().getDataBase64(this.handle);
		}
		getDataAsString() {
			return getCfgRenderCtx().getDataAsString(this.handle);
		}
		getDataAsJson() {
			const content = this.getDataAsString();
			if (content == void 0) throw new Error("Resource has no content.");
			return JSON.parse(content);
		}
		/**
		*
		*/
		getPColumns(errorOnUnknownField = false, prefix = "") {
			const result = this.parsePObjectCollection(errorOnUnknownField, prefix);
			if (result === void 0) return void 0;
			return Object.entries(result).map(([, obj]) => {
				if (!isPColumn(obj)) throw new Error(`not a PColumn (kind = ${obj.spec.kind})`);
				return obj;
			});
		}
		/**
		*
		*/
		parsePObjectCollection(errorOnUnknownField = false, prefix = "") {
			const pObjects = getCfgRenderCtx().parsePObjectCollection(this.handle, errorOnUnknownField, prefix, ...this.resolvePath);
			if (pObjects === void 0) return void 0;
			const result = {};
			for (const [key, value] of Object.entries(pObjects)) {
				const resolvePath = [...this.resolvePath, key];
				result[key] = mapPObjectData(value, (c) => new TreeNodeAccessor(c, resolvePath));
			}
			return result;
		}
		getFileContentAsBase64(range) {
			return new FutureRef(getCfgRenderCtx().getBlobContentAsBase64(this.handle, range));
		}
		getFileContentAsString(range) {
			return new FutureRef(getCfgRenderCtx().getBlobContentAsString(this.handle, range));
		}
		getFileContentAsJson(range) {
			return new FutureRef(getCfgRenderCtx().getBlobContentAsString(this.handle, range)).mapDefined((v) => JSON.parse(v));
		}
		/**
		* @deprecated use getFileContentAsBase64
		*/
		getBlobContentAsBase64() {
			return this.getFileContentAsBase64();
		}
		/**
		* @deprecated use getFileContentAsString
		*/
		getBlobContentAsString() {
			return this.getFileContentAsString();
		}
		/**
		* @returns downloaded file handle
		*/
		getFileHandle() {
			return new FutureRef(getCfgRenderCtx().getDownloadedBlobContentHandle(this.handle));
		}
		/**
		* @deprecated use getFileHandle
		*/
		getDownloadedBlobHandle() {
			return this.getFileHandle();
		}
		/**
		* @returns downloaded file handle
		*/
		getRemoteFileHandle() {
			return new FutureRef(getCfgRenderCtx().getOnDemandBlobContentHandle(this.handle));
		}
		/**
		* @deprecated use getRemoteFileHandle
		*/
		getOnDemandBlobHandle() {
			return this.getRemoteFileHandle();
		}
		/**
		* @returns the url to the extracted folder
		*/
		extractArchiveAndGetURL(format) {
			return new FutureRef(getCfgRenderCtx().extractArchiveAndGetURL(this.handle, format));
		}
		getImportProgress() {
			return new FutureRef(getCfgRenderCtx().getImportProgress(this.handle));
		}
		getLastLogs(nLines) {
			return new FutureRef(getCfgRenderCtx().getLastLogs(this.handle, nLines));
		}
		getProgressLog(patternToSearch) {
			return new FutureRef(getCfgRenderCtx().getProgressLog(this.handle, patternToSearch));
		}
		getProgressLogWithInfo(patternToSearch) {
			return new FutureRef(getCfgRenderCtx().getProgressLogWithInfo(this.handle, patternToSearch));
		}
		getLogHandle() {
			return new FutureRef(getCfgRenderCtx().getLogHandle(this.handle));
		}
		allFieldsResolved(fieldType = "Input") {
			switch (fieldType) {
				case "Input": return this.getInputsLocked() && this.listInputFields().every((field) => this.resolve({
					field,
					assertFieldType: "Input"
				}) !== void 0);
				case "Output": return this.getOutputsLocked() && this.listOutputFields().every((field) => this.resolve({
					field,
					assertFieldType: "Output"
				}) !== void 0);
			}
		}
		mapFields(_mapping, _ops) {
			const { fieldType, requireLocked, skipUnresolved } = {
				fieldType: "Input",
				requireLocked: true,
				skipUnresolved: false,
				..._ops
			};
			const mapping = _mapping;
			if (requireLocked) {
				if (fieldType === "Input" && !this.getInputsLocked()) return void 0;
				if (fieldType === "Output" && !this.getOutputsLocked()) return void 0;
			}
			let fieldEntries = (fieldType === "Input" ? this.listInputFields() : fieldType === "Output" ? this.listOutputFields() : this.listDynamicFields()).map((field) => [field, this.resolve({
				field,
				assertFieldType: fieldType
			})]);
			if (skipUnresolved) fieldEntries = fieldEntries.filter((e) => e[1] !== void 0);
			return fieldEntries.map(([name, value]) => mapping(name, value));
		}
	};
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/render/internal.js
	const StagingAccessorName = "staging";
	const MainAccessorName = "main";
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/render/util/axis_filtering.js
	function filterDataInfoEntries(dataInfoEntries, axisFilters) {
		const sortedFilters = [...axisFilters].sort((a, b) => b[0] - a[0]);
		const { type } = dataInfoEntries;
		switch (type) {
			case "Json": {
				const { keyLength } = dataInfoEntries;
				for (const [axisIdx] of axisFilters) if (axisIdx >= keyLength) throw new Error(`Can't filter on non-data axis ${axisIdx}. Must be >= ${keyLength}`);
				break;
			}
			case "JsonPartitioned":
			case "BinaryPartitioned":
			case "ParquetPartitioned": {
				const { partitionKeyLength } = dataInfoEntries;
				for (const [axisIdx] of axisFilters) if (axisIdx >= partitionKeyLength) throw new Error(`Can't filter on non-partitioned axis ${axisIdx}. Must be >= ${partitionKeyLength}`);
				break;
			}
			default: throw new Error(`Unsupported data info type: ${type}`);
		}
		const keyMatchesFilters = (key) => {
			for (const [axisIdx, axisValue] of sortedFilters) if (key[axisIdx] !== axisValue) return false;
			return true;
		};
		const removeFilteredAxes = (key) => {
			const newKey = [...key];
			for (const [axisIdx] of sortedFilters) newKey.splice(axisIdx, 1);
			return newKey;
		};
		switch (dataInfoEntries.type) {
			case "Json": return {
				type: "Json",
				keyLength: dataInfoEntries.keyLength - axisFilters.length,
				data: dataInfoEntries.data.filter((entry) => keyMatchesFilters(entry.key)).map((entry) => ({
					key: removeFilteredAxes(entry.key),
					value: entry.value
				}))
			};
			case "JsonPartitioned": return {
				type: "JsonPartitioned",
				partitionKeyLength: dataInfoEntries.partitionKeyLength - axisFilters.length,
				parts: dataInfoEntries.parts.filter((entry) => keyMatchesFilters(entry.key)).map((entry) => ({
					key: removeFilteredAxes(entry.key),
					value: entry.value
				}))
			};
			case "BinaryPartitioned": return {
				type: "BinaryPartitioned",
				partitionKeyLength: dataInfoEntries.partitionKeyLength - axisFilters.length,
				parts: dataInfoEntries.parts.filter((entry) => keyMatchesFilters(entry.key)).map((entry) => ({
					key: removeFilteredAxes(entry.key),
					value: entry.value
				}))
			};
			case "ParquetPartitioned": return {
				type: "ParquetPartitioned",
				partitionKeyLength: dataInfoEntries.partitionKeyLength - axisFilters.length,
				parts: dataInfoEntries.parts.filter((entry) => keyMatchesFilters(entry.key)).map((entry) => ({
					key: removeFilteredAxes(entry.key),
					value: entry.value
				}))
			};
		}
	}
	Array.isArray;
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+helpers@1.14.1/node_modules/@milaboratories/helpers/dist/error.js
	function throwError(v) {
		if (typeof v === "string") throw new Error(v);
		else throw v;
	}
	//#endregion
	//#region ../node_modules/.pnpm/@milaboratories+helpers@1.14.1/node_modules/@milaboratories/helpers/dist/uniqId.js
	function createGetIncrementalId() {
		let idx = 0n;
		return () => idx++;
	}
	createGetIncrementalId();
	//#endregion
	//#region ../node_modules/.pnpm/es-toolkit@1.42.0/node_modules/es-toolkit/dist/predicate/isFunction.mjs
	function isFunction(value) {
		return typeof value === "function";
	}
	//#endregion
	//#region ../node_modules/.pnpm/es-toolkit@1.42.0/node_modules/es-toolkit/dist/predicate/isNil.mjs
	function isNil(x) {
		return x == null;
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/labels/derive_distinct_labels.js
	const DISTANCE_PENALTY = .001;
	const LABEL_TYPE = "__LABEL__";
	const LABEL_TYPE_FULL = "__LABEL__@1";
	function deriveDistinctLabels(values, options = {}) {
		const forceTraceElements = options.forceTraceElements !== void 0 && options.forceTraceElements.length > 0 ? new Set(options.forceTraceElements) : void 0;
		const separator = options.separator ?? " / ";
		const linkerSuffixes = values.map((v, i) => {
			const spec = "spec" in v && typeof v.spec === "object" ? v.spec : v;
			const linkerLabels = extractLinkerLabels(v);
			if (linkerLabels.length === 0) return void 0;
			return isFunction(options.linkerLabelFormatter) ? options.linkerLabelFormatter(linkerLabels, spec, i) : `via ${linkerLabels.join(" > ")}`;
		});
		const records = values.map((v) => enrichRecord(v, options));
		const stats = collectTypeStats(records);
		const { mainTypes, secondaryTypes } = classifyTypes(stats, values.length);
		const build = (typeSet, force) => buildLabels(records, typeSet, forceTraceElements, separator, force);
		if (mainTypes.length === 0) {
			if (secondaryTypes.length !== 0) throw new Error("Non-empty secondary types list while main types list is empty.");
			return applyLinkerSuffixes(build(new Set(LABEL_TYPE_FULL), true) ?? throwError("Failed to derive labels using native column labels"), linkerSuffixes);
		}
		let includedCount = 0;
		let additionalType = -1;
		while (includedCount < mainTypes.length) {
			const currentSet = /* @__PURE__ */ new Set();
			if (options.includeNativeLabel) currentSet.add(LABEL_TYPE_FULL);
			for (let i = 0; i < includedCount; ++i) currentSet.add(mainTypes[i]);
			if (additionalType >= 0) currentSet.add(mainTypes[additionalType]);
			const candidateResult = build(currentSet, false);
			if (candidateResult !== void 0 && countUniqueLabels(candidateResult) === values.length) return applyLinkerSuffixes(build(minimizeTypeSet(currentSet, records, stats, forceTraceElements, options, separator), false) ?? throwError("Failed to derive unique labels"), linkerSuffixes);
			additionalType++;
			if (additionalType >= mainTypes.length) {
				includedCount++;
				additionalType = includedCount;
			}
		}
		return applyLinkerSuffixes(build(minimizeTypeSet(new Set([...mainTypes, ...secondaryTypes]), records, stats, forceTraceElements, options, separator), true) ?? throwError("Failed to derive unique labels"), linkerSuffixes);
	}
	/** Apply pre-formatted linker suffixes to labels that have them. */
	function applyLinkerSuffixes(labels, suffixes) {
		return labels.map((label, i) => isNil(suffixes[i]) ? label : `${label} ${suffixes[i]}`);
	}
	/** Extract linker labels from every step of the linkers path. */
	function extractLinkerLabels(entry) {
		if (!("spec" in entry) || typeof entry.spec !== "object") return [];
		const path = entry.linkerPath;
		if (path === void 0 || path.length === 0) return [];
		const labels = [];
		for (const step of path) {
			const label = (readAnnotation(step.spec, Annotation.LinkLabel) ?? readAnnotation(step.spec, Annotation.Label))?.trim();
			if (label !== void 0 && label.length > 0) labels.push(label);
		}
		return labels;
	}
	function extractSpecAndTrace(entry) {
		const isEnriched = "spec" in entry && typeof entry.spec === "object";
		return {
			spec: isEnriched ? entry.spec : entry,
			extraTrace: isEnriched ? entry.extraTrace : void 0,
			linkerPath: isEnriched ? entry.linkerPath : void 0
		};
	}
	function buildFullTrace(trace) {
		const result = [];
		const occurrences = /* @__PURE__ */ new Map();
		for (let i = trace.length - 1; i >= 0; --i) {
			const entry = trace[i];
			const occurrenceIndex = (occurrences.get(entry.type) ?? 0) + 1;
			occurrences.set(entry.type, occurrenceIndex);
			result.push({
				...entry,
				fullType: `${entry.type}@${occurrenceIndex}`,
				occurrenceIndex
			});
		}
		result.reverse();
		return result;
	}
	function enrichRecord(value, options) {
		const { spec, extraTrace } = extractSpecAndTrace(value);
		const label = readAnnotation(spec, Annotation.Label);
		const traceStr = readAnnotation(spec, Annotation.Trace);
		const baseTrace = traceStr ? parseJson(traceStr) ?? [] : [];
		const prefixExtra = extraTrace?.filter((e) => e.position === "prefix") ?? [];
		const suffixExtra = extraTrace?.filter((e) => e.position !== "prefix") ?? [];
		const trace = [
			...prefixExtra,
			...baseTrace,
			...suffixExtra
		];
		if (label !== void 0) {
			const labelEntry = {
				label,
				type: LABEL_TYPE,
				importance: -2
			};
			if (options.addLabelAsSuffix) trace.push(labelEntry);
			else trace.splice(0, 0, labelEntry);
		}
		return { fullTrace: buildFullTrace(trace) };
	}
	function collectTypeStats(records) {
		const importances = /* @__PURE__ */ new Map();
		const countByType = /* @__PURE__ */ new Map();
		for (const record of records) for (let i = 0; i < record.fullTrace.length; i++) {
			const { fullType, importance: rawImportance } = record.fullTrace[i];
			const importance = rawImportance ?? 0;
			const distance = (record.fullTrace.length - i) * DISTANCE_PENALTY;
			countByType.set(fullType, (countByType.get(fullType) ?? 0) + 1);
			importances.set(fullType, Math.max(importances.get(fullType) ?? Number.NEGATIVE_INFINITY, importance - distance));
		}
		return {
			importances,
			countByType
		};
	}
	function classifyTypes(stats, totalRecords) {
		const sorted = [...stats.importances].sort(([, i1], [, i2]) => i2 - i1);
		const mainTypes = [];
		const secondaryTypes = [];
		for (const [typeName] of sorted) if (typeName.endsWith("@1") || stats.countByType.get(typeName) === totalRecords) mainTypes.push(typeName);
		else secondaryTypes.push(typeName);
		return {
			mainTypes,
			secondaryTypes
		};
	}
	function buildLabels(records, includedTypes, forceTraceElements, separator, force) {
		const result = [];
		for (const r of records) {
			const parts = [];
			for (const ft of r.fullTrace) if (includedTypes.has(ft.fullType) || forceTraceElements?.has(ft.type)) parts.push(ft.label);
			if (parts.length === 0) {
				if (!force) return void 0;
				result.push("Unlabeled");
				continue;
			}
			result.push(parts.join(separator));
		}
		return result;
	}
	function countUniqueLabels(result) {
		if (result === void 0) return 0;
		return new Set(result).size;
	}
	function minimizeTypeSet(typeSet, records, stats, forceTraceElements, options, separator) {
		const initialResult = buildLabels(records, typeSet, forceTraceElements, separator, false);
		if (initialResult === void 0) return typeSet;
		const targetCardinality = countUniqueLabels(initialResult);
		const result = new Set(typeSet);
		const removable = [...result].filter((t) => !forceTraceElements?.has(t.split("@")[0]) && !(options.includeNativeLabel && t === LABEL_TYPE_FULL)).sort((a, b) => (stats.importances.get(a) ?? 0) - (stats.importances.get(b) ?? 0));
		for (const typeToRemove of removable) {
			const candidate = new Set(result);
			candidate.delete(typeToRemove);
			const candidateResult = buildLabels(records, candidate, forceTraceElements, separator, false);
			if (candidateResult !== void 0 && countUniqueLabels(candidateResult) >= targetCardinality) result.delete(typeToRemove);
		}
		return result;
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/render/util/label.js
	/** @deprecated Use deriveDistinctLabels */
	function deriveLabels(values, getSpec, options = {}) {
		return deriveDistinctLabels(values.map(getSpec), options).map((label, i) => ({
			value: values[i],
			label
		}));
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/render/util/pcolumn_data.js
	const PCD_PREFIX = "PColumnData/";
	const RT_RESOURCE_MAP = PCD_PREFIX + "ResourceMap";
	const RT_RESOURCE_MAP_PARTITIONED = PCD_PREFIX + "Partitioned/ResourceMap";
	const RT_JSON_PARTITIONED = PCD_PREFIX + "JsonPartitioned";
	const RT_BINARY_PARTITIONED = PCD_PREFIX + "BinaryPartitioned";
	const RT_PARQUET_PARTITIONED = PCD_PREFIX + "ParquetPartitioned";
	const PCD_SUP_PREFIX = PCD_PREFIX + "Partitioned/";
	const RT_JSON_SUPER_PARTITIONED = PCD_SUP_PREFIX + "JsonPartitioned";
	const RT_BINARY_SUPER_PARTITIONED = PCD_SUP_PREFIX + "BinaryPartitioned";
	const RT_PARQUET_SUPER_PARTITIONED = PCD_SUP_PREFIX + "ParquetPartitioned";
	const removeIndexSuffix = (keyStr) => {
		if (keyStr.endsWith(".index")) return {
			baseKey: keyStr.substring(0, keyStr.length - 6),
			type: "index"
		};
		else if (keyStr.endsWith(".values")) return {
			baseKey: keyStr.substring(0, keyStr.length - 7),
			type: "values"
		};
		else throw new Error(`key must ends on .index/.values for binary p-column, got: ${keyStr}`);
	};
	/** Returns a list of all partition keys appeared in the p-column */
	function getPartitionKeysList(acc) {
		if (!acc) return void 0;
		const rt = acc.resourceType.name;
		const meta = acc.getDataAsJson();
		const data = [];
		let keyLength = 0;
		switch (rt) {
			case RT_RESOURCE_MAP:
				keyLength = meta["keyLength"];
				break;
			case RT_RESOURCE_MAP_PARTITIONED:
				keyLength = meta["partitionKeyLength"] + meta["keyLength"];
				break;
			case RT_JSON_PARTITIONED:
			case RT_BINARY_PARTITIONED:
			case RT_PARQUET_PARTITIONED:
				keyLength = meta["partitionKeyLength"];
				break;
			case RT_BINARY_SUPER_PARTITIONED:
			case RT_JSON_SUPER_PARTITIONED:
			case RT_PARQUET_SUPER_PARTITIONED:
				keyLength = meta["superPartitionKeyLength"] + meta["partitionKeyLength"];
				break;
		}
		switch (rt) {
			case RT_RESOURCE_MAP:
			case RT_JSON_PARTITIONED:
			case RT_BINARY_PARTITIONED:
			case RT_PARQUET_PARTITIONED:
				for (let keyStr of acc.listInputFields()) {
					if (rt === "PColumnData/BinaryPartitioned") keyStr = removeIndexSuffix(keyStr).baseKey;
					const key = [...JSON.parse(keyStr)];
					data.push(key);
				}
				break;
			case RT_RESOURCE_MAP_PARTITIONED:
			case RT_BINARY_SUPER_PARTITIONED:
			case RT_JSON_SUPER_PARTITIONED:
			case RT_PARQUET_SUPER_PARTITIONED:
				for (const supKeyStr of acc.listInputFields()) {
					const keyPrefix = [...JSON.parse(supKeyStr)];
					const value = acc.resolve({
						field: supKeyStr,
						assertFieldType: "Input"
					});
					if (value !== void 0) for (let keyStr of value.listInputFields()) {
						if (rt === "PColumnData/Partitioned/BinaryPartitioned") keyStr = removeIndexSuffix(keyStr).baseKey;
						const key = [...keyPrefix, ...JSON.parse(keyStr)];
						data.push(key);
					}
				}
				break;
		}
		return {
			data,
			keyLength
		};
	}
	function getUniquePartitionKeysForDataEntries(list) {
		if (list.type !== "JsonPartitioned" && list.type !== "BinaryPartitioned" && list.type !== "ParquetPartitioned") throw new Error(`Splitting requires Partitioned DataInfoEntries, got ${list.type}`);
		const { parts, partitionKeyLength } = list;
		const result = [];
		for (let i = 0; i < partitionKeyLength; ++i) result.push(/* @__PURE__ */ new Set());
		for (const part of parts) {
			const key = part.key;
			if (key.length !== partitionKeyLength) throw new Error(`Key length (${key.length}) does not match partition length (${partitionKeyLength}) for key: ${JSON.stringify(key)}`);
			for (let i = 0; i < partitionKeyLength; ++i) result[i].add(key[i]);
		}
		return result.map((s) => Array.from(s.values()));
	}
	function getUniquePartitionKeys(acc) {
		if (acc === void 0) return void 0;
		if (isDataInfoEntries(acc)) return getUniquePartitionKeysForDataEntries(acc);
		const list = getPartitionKeysList(acc);
		if (!list) return void 0;
		const { data, keyLength } = list;
		const result = [];
		for (let i = 0; i < keyLength; ++i) result.push(/* @__PURE__ */ new Set());
		for (const l of data) {
			if (l.length !== keyLength) throw new Error("key length does not match partition length");
			for (let i = 0; i < keyLength; ++i) result[i].add(l[i]);
		}
		return result.map((s) => Array.from(s.values()));
	}
	/**
	* Parses the PColumn data from a TreeNodeAccessor into a DataInfoEntries structure.
	* Returns undefined if any required data is missing.
	* Throws error on validation failures.
	*
	* @param acc - The TreeNodeAccessor containing PColumn data
	* @param keyPrefix - Optional key prefix for recursive calls
	* @returns DataInfoEntries representation of the PColumn data, or undefined if incomplete
	*/
	function parsePColumnData(acc, keyPrefix = []) {
		if (acc === void 0) return void 0;
		if (!acc.getIsReadyOrError()) return void 0;
		const resourceType = acc.resourceType.name;
		const meta = acc.getDataAsJson();
		if (keyPrefix.length > 0 && (resourceType === "PColumnData/Partitioned/JsonPartitioned" || resourceType === "PColumnData/Partitioned/BinaryPartitioned" || resourceType === "PColumnData/Partitioned/ParquetPartitioned")) throw new Error(`Unexpected nested super-partitioned resource: ${resourceType}`);
		switch (resourceType) {
			case RT_RESOURCE_MAP:
			case RT_RESOURCE_MAP_PARTITIONED: throw new Error(`Only data columns are supported, got: ${resourceType}`);
			case RT_JSON_PARTITIONED: {
				if (typeof meta?.partitionKeyLength !== "number") throw new Error(`Missing partitionKeyLength in metadata for ${resourceType}`);
				const parts = [];
				for (const keyStr of acc.listInputFields()) {
					const value = acc.resolve({
						field: keyStr,
						assertFieldType: "Input"
					});
					if (value === void 0) return void 0;
					const key = [...keyPrefix, ...JSON.parse(keyStr)];
					parts.push({
						key,
						value
					});
				}
				return {
					type: "JsonPartitioned",
					partitionKeyLength: meta.partitionKeyLength,
					parts
				};
			}
			case RT_BINARY_PARTITIONED: {
				if (typeof meta?.partitionKeyLength !== "number") throw new Error(`Missing partitionKeyLength in metadata for ${resourceType}`);
				const parts = [];
				const baseKeys = /* @__PURE__ */ new Map();
				for (const keyStr of acc.listInputFields()) {
					const suffix = removeIndexSuffix(keyStr);
					const value = acc.resolve({
						field: keyStr,
						assertFieldType: "Input"
					});
					if (value === void 0) return void 0;
					let entry = baseKeys.get(suffix.baseKey);
					if (!entry) {
						entry = {};
						baseKeys.set(suffix.baseKey, entry);
					}
					if (suffix.type === "index") entry.index = value;
					else entry.values = value;
				}
				for (const [baseKeyStr, entry] of baseKeys.entries()) {
					if (!entry.index || !entry.values) return void 0;
					const key = [...keyPrefix, ...JSON.parse(baseKeyStr)];
					parts.push({
						key,
						value: {
							index: entry.index,
							values: entry.values
						}
					});
				}
				return {
					type: "BinaryPartitioned",
					partitionKeyLength: meta.partitionKeyLength,
					parts
				};
			}
			case RT_PARQUET_PARTITIONED: {
				if (typeof meta?.partitionKeyLength !== "number") throw new Error(`Missing partitionKeyLength in metadata for ${resourceType}`);
				const parts = [];
				for (const keyStr of acc.listInputFields()) {
					const value = acc.resolve({
						field: keyStr,
						assertFieldType: "Input"
					});
					if (value === void 0) return void 0;
					const key = [...keyPrefix, ...JSON.parse(keyStr)];
					parts.push({
						key,
						value
					});
				}
				return {
					type: "ParquetPartitioned",
					partitionKeyLength: meta.partitionKeyLength,
					parts
				};
			}
			case RT_JSON_SUPER_PARTITIONED: {
				if (typeof meta?.superPartitionKeyLength !== "number" || typeof meta?.partitionKeyLength !== "number") throw new Error(`Missing superPartitionKeyLength or partitionKeyLength in metadata for ${resourceType}`);
				const totalKeyLength = meta.superPartitionKeyLength + meta.partitionKeyLength;
				const parts = [];
				for (const supKeyStr of acc.listInputFields()) {
					const superPartition = acc.resolve({
						field: supKeyStr,
						assertFieldType: "Input"
					});
					if (superPartition === void 0) return void 0;
					if (superPartition.resourceType.name !== "PColumnData/JsonPartitioned") throw new Error(`Expected ${RT_JSON_PARTITIONED} inside ${resourceType}, but got ${superPartition.resourceType.name}`);
					const innerResult = parsePColumnData(superPartition, JSON.parse(supKeyStr));
					if (innerResult === void 0) return void 0;
					if (innerResult.type !== "JsonPartitioned") throw new Error(`Unexpected inner result type for ${resourceType}: ${innerResult.type}`);
					parts.push(...innerResult.parts);
				}
				return {
					type: "JsonPartitioned",
					partitionKeyLength: totalKeyLength,
					parts
				};
			}
			case RT_BINARY_SUPER_PARTITIONED: {
				if (typeof meta?.superPartitionKeyLength !== "number" || typeof meta?.partitionKeyLength !== "number") throw new Error(`Missing superPartitionKeyLength or partitionKeyLength in metadata for ${resourceType}`);
				const totalKeyLength = meta.superPartitionKeyLength + meta.partitionKeyLength;
				const parts = [];
				for (const supKeyStr of acc.listInputFields()) {
					const superPartition = acc.resolve({
						field: supKeyStr,
						assertFieldType: "Input"
					});
					if (superPartition === void 0) return void 0;
					if (superPartition.resourceType.name !== "PColumnData/BinaryPartitioned") throw new Error(`Expected ${RT_BINARY_PARTITIONED} inside ${resourceType}, but got ${superPartition.resourceType.name}`);
					const innerResult = parsePColumnData(superPartition, JSON.parse(supKeyStr));
					if (innerResult === void 0) return void 0;
					if (innerResult.type !== "BinaryPartitioned") throw new Error(`Unexpected inner result type for ${resourceType}: ${innerResult.type}`);
					parts.push(...innerResult.parts);
				}
				return {
					type: "BinaryPartitioned",
					partitionKeyLength: totalKeyLength,
					parts
				};
			}
			case RT_PARQUET_SUPER_PARTITIONED: {
				if (typeof meta?.superPartitionKeyLength !== "number" || typeof meta?.partitionKeyLength !== "number") throw new Error(`Missing superPartitionKeyLength or partitionKeyLength in metadata for ${resourceType}`);
				const totalKeyLength = meta.superPartitionKeyLength + meta.partitionKeyLength;
				const parts = [];
				for (const supKeyStr of acc.listInputFields()) {
					const superPartition = acc.resolve({
						field: supKeyStr,
						assertFieldType: "Input"
					});
					if (superPartition === void 0) return void 0;
					if (superPartition.resourceType.name !== "PColumnData/ParquetPartitioned") throw new Error(`Expected ${RT_PARQUET_PARTITIONED} inside ${resourceType}, but got ${superPartition.resourceType.name}`);
					const innerResult = parsePColumnData(superPartition, JSON.parse(supKeyStr));
					if (innerResult === void 0) return void 0;
					if (innerResult.type !== "ParquetPartitioned") throw new Error(`Unexpected inner result type for ${resourceType}: ${innerResult.type}`);
					parts.push(...innerResult.parts);
				}
				return {
					type: "ParquetPartitioned",
					partitionKeyLength: totalKeyLength,
					parts
				};
			}
			default: throw new Error(`Unknown resource type: ${resourceType}`);
		}
	}
	/**
	* Converts or parses the input into DataInfoEntries format.
	
	* @param acc - The input data, which can be TreeNodeAccessor, DataInfoEntries, DataInfo, or undefined.
	* @returns The data in DataInfoEntries format, or undefined if the input was undefined or data is not ready.
	*/
	function convertOrParsePColumnData(acc) {
		if (acc === void 0) return void 0;
		if (isDataInfoEntries(acc)) return acc;
		if (isDataInfo(acc)) return dataInfoToEntries(acc);
		if (acc instanceof TreeNodeAccessor) return parsePColumnData(acc);
		throw new Error(`Unexpected input type: ${typeof acc}`);
	}
	function isPColumnReady(c) {
		const isValues = (d) => Array.isArray(d);
		const isAccessor = (d) => d instanceof TreeNodeAccessor;
		let ready = true;
		const data = typeof c.data === "function" ? c.data() : c.data;
		if (data == null) return false;
		else if (isAccessor(data)) ready &&= data.getIsReadyOrError();
		else if (isDataInfo(data)) visitDataInfo(data, (v) => ready &&= v.getIsReadyOrError());
		else if (!isValues(data)) throw Error(`unsupported column data type: ${data}`);
		return ready;
	}
	function allPColumnsReady(columns) {
		return columns.every(isPColumnReady);
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/render/util/column_collection.js
	function isPColumnValues(value) {
		if (!Array.isArray(value)) return false;
		if (value.length === 0) return true;
		const first = value[0];
		return typeof first === "object" && first !== null && "key" in first && "val" in first;
	}
	/**
	* A simple implementation of {@link ColumnProvider} backed by a pre-defined array of columns.
	*/
	var ArrayColumnProvider = class {
		constructor(columns) {
			this.columns = columns;
		}
		selectColumns(selectors) {
			const predicate = typeof selectors === "function" ? selectors : legacyColumnSelectorsToPredicate(selectors);
			return this.columns.filter((column) => predicate(column.spec));
		}
	};
	function splitFiltersToExtraTrace(splitFilters) {
		if (splitFilters === void 0) return void 0;
		return splitFilters.map((filter) => ({
			type: `split:${canonicalizeAxisId(filter.axisId)}`,
			label: filter.label,
			importance: 1e6
		}));
	}
	function splitFiltersToAxisFilter(splitFilters) {
		if (!splitFilters) return void 0;
		return splitFilters.map((filter) => [filter.axisIdx, filter.value]);
	}
	function fallbackIdDeriver(originalId, axisFilters) {
		if (!axisFilters || axisFilters.length === 0) return originalId;
		return (0, import_canonicalize.default)({
			id: originalId,
			axisFilters: [...axisFilters].sort((a, b) => a[0] - b[0])
		});
	}
	/** Checks if a selector object uses any anchor properties */
	function hasAnchors(selector) {
		if (!selector || typeof selector !== "object") return false;
		const potentialAnchored = selector;
		const hasAnchorValues = (obj) => obj && typeof obj === "object" && Object.values(obj).some((v) => typeof v === "object" && v !== null && "anchor" in v);
		const domainHasAnchors = hasAnchorValues(potentialAnchored["domain"]);
		const contextDomainHasAnchors = hasAnchorValues(potentialAnchored["contextDomain"]);
		const axesHaveAnchors = potentialAnchored["axes"] && Array.isArray(potentialAnchored["axes"]) && potentialAnchored["axes"].some((a) => typeof a === "object" && a !== null && "anchor" in a);
		return !!potentialAnchored["domainAnchor"] || !!potentialAnchored["contextDomainAnchor"] || domainHasAnchors || contextDomainHasAnchors || axesHaveAnchors;
	}
	/**
	* Derives the indices of axes marked for splitting based on the selector.
	* Throws an error if splitting is requested alongside `partialAxesMatch`.
	*/
	function getSplitAxisIndices(selector) {
		if (typeof selector !== "object" || !("axes" in selector) || selector.axes === void 0) return [];
		const splitIndices = selector.axes.map((axis, index) => typeof axis === "object" && "split" in axis && axis.split === true ? index : -1).filter((index) => index !== -1);
		if (splitIndices.length > 0 && selector.partialAxesMatch !== void 0) throw new Error("Axis splitting is not supported when `partialAxesMatch` is defined.");
		splitIndices.sort((a, b) => a - b);
		return splitIndices;
	}
	var PColumnCollection = class {
		defaultProviderStore = [];
		providers = [new ArrayColumnProvider(this.defaultProviderStore)];
		axisLabelProviders = [];
		constructor() {}
		addColumnProvider(provider) {
			this.providers.push(provider);
			return this;
		}
		addAxisLabelProvider(provider) {
			this.axisLabelProviders.push(provider);
			return this;
		}
		addColumns(columns) {
			this.defaultProviderStore.push(...columns);
			return this;
		}
		addColumn(column) {
			this.defaultProviderStore.push(column);
			return this;
		}
		/** Fetches labels for a given axis from the registered providers */
		findLabels(axis) {
			for (const provider of this.axisLabelProviders) {
				const labels = provider.findLabels(axis);
				if (labels) return labels;
			}
		}
		getUniversalEntries(predicateOrSelectors, opts) {
			const { anchorCtx, labelOps: rawLabelOps, dontWaitAllData = false, overrideLabelAnnotation = false, exclude, enrichByLinkers = false } = opts ?? {};
			const labelOps = {
				...overrideLabelAnnotation && rawLabelOps?.includeNativeLabel !== false ? { includeNativeLabel: true } : {},
				...rawLabelOps
			};
			let excludePredicate = () => false;
			if (exclude) {
				const excludePredicartes = (Array.isArray(exclude) ? exclude : [exclude]).map((selector) => {
					if (hasAnchors(selector)) {
						if (!anchorCtx) throw new Error("Anchored selectors in exclude require an AnchoredIdDeriver to be provided in options.");
						return legacyColumnSelectorsToPredicate(resolveAnchors(anchorCtx.anchors, selector, opts));
					} else return legacyColumnSelectorsToPredicate(selector);
				});
				excludePredicate = (spec) => excludePredicartes.some((predicate) => predicate(spec));
			}
			const selectorsArray = typeof predicateOrSelectors === "function" ? [predicateOrSelectors] : Array.isArray(predicateOrSelectors) ? predicateOrSelectors : [predicateOrSelectors];
			const intermediateResults = [];
			const selectedNativeIds = /* @__PURE__ */ new Set();
			for (const rawSelector of selectorsArray) {
				const usesAnchors = hasAnchors(rawSelector);
				let currentSelector;
				if (usesAnchors) {
					if (!anchorCtx) throw new Error("Anchored selectors require an AnchoredIdDeriver to be provided in options.");
					currentSelector = resolveAnchors(anchorCtx.anchors, rawSelector, opts);
				} else currentSelector = rawSelector;
				const selectedIds = /* @__PURE__ */ new Set();
				const selectedColumns = [];
				for (const provider of this.providers) {
					const providerColumns = provider.selectColumns(currentSelector);
					for (const col of providerColumns) {
						if (excludePredicate(col.spec)) continue;
						if (selectedIds.has(col.id)) throw new Error(`Duplicate column id ${col.id} in provider ${provider.constructor.name}`);
						const nativeId = deriveNativeId(col.spec);
						if (selectedNativeIds.has(nativeId)) continue;
						selectedIds.add(col.id);
						selectedNativeIds.add(nativeId);
						selectedColumns.push(col);
					}
				}
				if (selectedColumns.length === 0) continue;
				const splitAxisIdxs = getSplitAxisIndices(rawSelector);
				const needsSplitting = splitAxisIdxs.length > 0;
				for (const column of selectedColumns) {
					if (!isPColumnSpec(column.spec)) continue;
					const originalSpec = column.spec;
					if (needsSplitting) {
						if (isPColumnValues(column.data)) throw new Error(`Splitting is not supported for PColumns with PColumnValues data format. Column id: ${column.id}`);
						const dataEntries = convertOrParsePColumnData(column.data);
						if (!dataEntries) {
							if (dontWaitAllData) continue;
							return;
						}
						if (!isPartitionedDataInfoEntries(dataEntries)) throw new Error(`Splitting requires Partitioned DataInfoEntries, but parsing resulted in ${dataEntries.type} for column ${column.id}`);
						const uniqueKeys = getUniquePartitionKeys(dataEntries);
						const maxSplitIdx = splitAxisIdxs[splitAxisIdxs.length - 1];
						if (maxSplitIdx >= dataEntries.partitionKeyLength) throw new Error(`Not enough partition keys (${dataEntries.partitionKeyLength}) for requested split axes (max index ${maxSplitIdx}) in column ${originalSpec.name}`);
						const axesLabels = splitAxisIdxs.map((idx) => this.findLabels(getAxisId(originalSpec.axesSpec[idx])));
						const keyCombinations = [];
						const generateCombinations = (currentCombo, sAxisIdx) => {
							if (sAxisIdx >= splitAxisIdxs.length) {
								keyCombinations.push([...currentCombo]);
								if (keyCombinations.length > 1e4) throw new Error("Too many key combinations, aborting.");
								return;
							}
							const axisIdx = splitAxisIdxs[sAxisIdx];
							if (axisIdx >= uniqueKeys.length) throw new Error(`Axis index ${axisIdx} out of bounds for unique keys array (length ${uniqueKeys.length}) during split key generation for column ${column.id}`);
							const axisValues = uniqueKeys[axisIdx];
							if (!axisValues || axisValues.length === 0) {
								keyCombinations.length = 0;
								return;
							}
							for (const val of axisValues) {
								currentCombo.push(val);
								generateCombinations(currentCombo, sAxisIdx + 1);
								currentCombo.pop();
							}
						};
						generateCombinations([], 0);
						if (keyCombinations.length === 0) continue;
						const newAxesSpec = [...originalSpec.axesSpec];
						const splitAxisOriginalIdxs = splitAxisIdxs.map((idx) => idx);
						for (let i = splitAxisIdxs.length - 1; i >= 0; i--) newAxesSpec.splice(splitAxisIdxs[i], 1);
						const adjustedSpec = {
							...originalSpec,
							axesSpec: newAxesSpec
						};
						for (const keyCombo of keyCombinations) {
							const splitFilters = keyCombo.map((value, sAxisIdx) => {
								const axisIdx = splitAxisOriginalIdxs[sAxisIdx];
								return {
									axisIdx,
									axisId: getAxisId(originalSpec.axesSpec[axisIdx]),
									value,
									label: axesLabels[sAxisIdx]?.[value] ?? String(value)
								};
							});
							intermediateResults.push({
								type: "split",
								originalColumn: column,
								spec: originalSpec,
								adjustedSpec,
								dataEntries,
								axisFilters: splitFilters
							});
						}
					} else intermediateResults.push({
						type: "direct",
						originalColumn: column,
						spec: originalSpec,
						adjustedSpec: originalSpec
					});
				}
			}
			if (intermediateResults.length === 0) return [];
			const labeledResults = deriveLabels(intermediateResults, (entry) => ({
				spec: entry.spec,
				extraTrace: entry.type === "split" ? splitFiltersToExtraTrace(entry.axisFilters) : void 0
			}), labelOps);
			const result = [];
			for (const { value: entry, label } of labeledResults) {
				const { originalColumn, spec: originalSpec } = entry;
				const axisFiltersTuple = splitFiltersToAxisFilter(entry.type === "split" ? entry.axisFilters : void 0);
				let finalId;
				if (anchorCtx) finalId = anchorCtx.deriveS(originalSpec, axisFiltersTuple);
				else finalId = fallbackIdDeriver(originalColumn.id, axisFiltersTuple);
				let finalSpec = { ...entry.adjustedSpec };
				if (overrideLabelAnnotation) finalSpec = {
					...finalSpec,
					annotations: {
						...finalSpec.annotations,
						[Annotation.Label]: label
					}
				};
				result.push({
					id: finalId,
					spec: finalSpec,
					data: () => entry.type === "split" ? entriesToDataInfo(filterDataInfoEntries(entry.dataEntries, axisFiltersTuple)) : entry.originalColumn.data,
					label
				});
			}
			const ids = new Set(result.map((entry) => entry.id));
			if (enrichByLinkers && anchorCtx) {
				const linkers = result.filter((entry) => isLinkerColumn(entry.spec));
				if (linkers.length === 0) return result;
				const anchorAxes = Object.values(anchorCtx.anchors).flatMap((anchor) => anchor.axesSpec);
				const linkerMap = LinkerMap.fromColumns(linkers.map(getColumnIdAndSpec));
				function matchAxisIdFn(linkerKeyId, sourceAxisId) {
					return matchAxisId(linkerKeyId, sourceAxisId) || matchAxisId(sourceAxisId, linkerKeyId);
				}
				const availableByLinkersAxes = linkerMap.getReachableByLinkersAxesFromAxes(anchorAxes, matchAxisIdFn);
				const availableByLinkersColumns = this.getUniversalEntries((spec) => !isLinkerColumn(spec) && spec.axesSpec.some((columnAxisSpec) => {
					const columnAxisId = getAxisId(columnAxisSpec);
					return availableByLinkersAxes.some((axis) => matchAxisIdFn(getAxisId(axis), columnAxisId));
				}), {
					anchorCtx,
					labelOps,
					dontWaitAllData,
					overrideLabelAnnotation,
					exclude
				});
				if (availableByLinkersColumns) result.push(...availableByLinkersColumns.filter((entry) => !ids.has(entry.id)));
			}
			return result;
		}
		getColumns(predicateOrSelectors, opts) {
			const entries = this.getUniversalEntries(predicateOrSelectors, {
				overrideLabelAnnotation: true,
				...opts
			});
			if (!entries) return void 0;
			const columns = [];
			for (const entry of entries) {
				const data = entry.data();
				if (!data) {
					if (opts?.dontWaitAllData) continue;
					return;
				}
				columns.push({
					id: entry.id,
					spec: entry.spec,
					data
				});
			}
			return columns;
		}
	};
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/render/util/pframe_upgraders.js
	function patchInSetFilters(filters) {
		const inSetToOrEqual = (predicate) => {
			if (predicate.operator !== "InSet") return predicate;
			return {
				operator: "Or",
				operands: predicate.references.map((reference) => ({
					operator: "Equal",
					reference
				}))
			};
		};
		const mapSingleValuePredicate = (filter, cb) => {
			switch (filter.operator) {
				case "And": return {
					...filter,
					operands: filter.operands.map((operand) => mapSingleValuePredicate(operand, cb))
				};
				case "Or": return {
					...filter,
					operands: filter.operands.map((operand) => mapSingleValuePredicate(operand, cb))
				};
				case "Not": return {
					...filter,
					operand: mapSingleValuePredicate(filter.operand, cb)
				};
				default: return cb(filter);
			}
		};
		const mapFilter = (filter, cb) => {
			return {
				...filter,
				predicate: mapSingleValuePredicate(filter.predicate, cb)
			};
		};
		return filters.map((filter) => mapFilter(filter, inSetToOrEqual));
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/render/api.js
	/**
	* Helper function to match domain objects
	* @param query Optional domain to match against
	* @param target Optional domain to match
	* @returns true if domains match, false otherwise
	*/
	function matchDomain(query, target) {
		if (query === void 0) return target === void 0;
		if (target === void 0) return true;
		for (const k in target) if (query[k] !== target[k]) return false;
		return true;
	}
	/**
	* Transforms PColumn data into the internal representation expected by the platform
	* @param data Data from a PColumn to transform
	* @returns Transformed data compatible with platform API
	*/
	function transformPColumnData(data) {
		return mapPObjectData(data, (d) => {
			if (d instanceof TreeNodeAccessor) return d.handle;
			else if (isDataInfo(d)) return mapDataInfo(d, (accessor) => accessor.handle);
			else return d;
		});
	}
	var ResultPool = class {
		ctx = getCfgRenderCtx();
		/**
		* @deprecated use getOptions()
		*/
		calculateOptions(predicate) {
			return this.ctx.calculateOptions(predicate);
		}
		getOptions(predicateOrSelector, opts) {
			const predicate = typeof predicateOrSelector === "function" ? predicateOrSelector : legacyColumnSelectorsToPredicate(predicateOrSelector);
			const filtered = this.getSpecs().entries.filter((s) => predicate(s.obj));
			let labelOps = {};
			let refsWithEnrichments = false;
			if (typeof opts !== "undefined") {
				if (typeof opts === "function") labelOps = opts;
				else if (typeof opts === "object") if ("includeNativeLabel" in opts || "separator" in opts || "addLabelAsSuffix" in opts) labelOps = opts;
				else {
					opts = opts;
					labelOps = opts.label ?? {};
					refsWithEnrichments = opts.refsWithEnrichments ?? false;
				}
			}
			if (typeof labelOps === "object") return deriveLabels(filtered, (o) => o.obj, labelOps ?? {}).map(({ value: { ref }, label }) => ({
				ref: withEnrichments(ref, refsWithEnrichments),
				label
			}));
			else return filtered.map(({ ref, obj }) => ({
				ref: withEnrichments(ref, refsWithEnrichments),
				label: labelOps(obj, ref)
			}));
		}
		resolveAnchorCtx(anchorsOrCtx) {
			if (anchorsOrCtx instanceof AnchoredIdDeriver) return anchorsOrCtx;
			const resolvedAnchors = {};
			for (const [key, value] of Object.entries(anchorsOrCtx)) if (isPlRef(value)) {
				const resolvedSpec = this.getPColumnSpecByRef(value);
				if (!resolvedSpec) return void 0;
				resolvedAnchors[key] = resolvedSpec;
			} else resolvedAnchors[key] = value;
			return new AnchoredIdDeriver(resolvedAnchors);
		}
		/**
		* Returns columns that match the provided anchors and selectors. It applies axis filters and label derivation.
		*
		* @param anchorsOrCtx - Anchor context for column selection (same as in getCanonicalOptions)
		* @param predicateOrSelectors - Predicate or selectors for filtering columns (same as in getCanonicalOptions)
		* @param opts - Optional configuration for label generation and data waiting
		* @returns A PFrameHandle for the created PFrame, or undefined if any required data is missing
		*/
		getAnchoredPColumns(anchorsOrCtx, predicateOrSelectors, opts) {
			const anchorCtx = this.resolveAnchorCtx(anchorsOrCtx);
			if (!anchorCtx) return void 0;
			return new PColumnCollection().addColumnProvider(this).addAxisLabelProvider(this).getColumns(predicateOrSelectors, {
				...opts,
				anchorCtx
			});
		}
		/**
		* Calculates anchored identifier options for columns matching a given predicate and returns their
		* canonicalized representations.
		*
		* This function filters column specifications from the result pool that match the provided predicate,
		* creates a standardized AnchorCtx from the provided anchors, and generates a list of label-value
		* pairs for UI components (like dropdowns).
		*
		* @param anchorsOrCtx - Either:
		*                     - An existing AnchorCtx instance
		*                     - A record mapping anchor IDs to PColumnSpec objects
		*                     - A record mapping anchor IDs to PlRef objects (which will be resolved to PColumnSpec)
		* @param predicateOrSelectors - Either:
		*                            - A predicate function that takes a PColumnSpec and returns a boolean.
		*                              Only specs that return true will be included.
		*                            - An APColumnSelector object for declarative filtering, which will be
		*                              resolved against the provided anchors and matched using matchPColumn.
		*                            - An array of APColumnSelector objects - columns matching ANY selector
		*                              in the array will be included (OR operation).
		* @param opts - Optional configuration for label generation:
		*                 - labelOps: Optional configuration for label generation:
		*                   - includeNativeLabel: Whether to include native column labels
		*                   - separator: String to use between label parts (defaults to " / ")
		*                   - addLabelAsSuffix: Whether to add labels as suffix instead of prefix
		*                 - dontWaitAllData: Whether to skip columns that don't have all data (if not set, will return undefined,
		*                                    if at least one column that requires splitting is missing data)
		* @returns An array of objects with `label` (display text) and `value` (anchored ID string) properties,
		*          or undefined if any PlRef resolution fails.
		*/
		getCanonicalOptions(anchorsOrCtx, predicateOrSelectors, opts) {
			const anchorCtx = this.resolveAnchorCtx(anchorsOrCtx);
			if (!anchorCtx) return void 0;
			const entries = new PColumnCollection().addColumnProvider(this).addAxisLabelProvider(this).getUniversalEntries(predicateOrSelectors, {
				...opts,
				anchorCtx
			});
			if (!entries) return void 0;
			return entries.map((item) => ({
				value: item.id,
				label: item.label
			}));
		}
		/**
		* @deprecated use getData()
		*/
		getDataFromResultPool() {
			return this.getData();
		}
		getData() {
			const result = this.ctx.getDataFromResultPool();
			return {
				isComplete: result.isComplete,
				entries: result.entries.map((e) => ({
					ref: e.ref,
					obj: {
						...e.obj,
						data: new TreeNodeAccessor(e.obj.data, [e.ref.blockId, e.ref.name])
					}
				}))
			};
		}
		/**
		* @deprecated use getDataWithErrors()
		*/
		getDataWithErrorsFromResultPool() {
			return this.getDataWithErrors();
		}
		getDataWithErrors() {
			const result = this.ctx.getDataWithErrorsFromResultPool();
			return {
				isComplete: result.isComplete,
				entries: result.entries.map((e) => ({
					ref: e.ref,
					obj: {
						...e.obj,
						data: mapValueInVOE(e.obj.data, (handle) => new TreeNodeAccessor(handle, [e.ref.blockId, e.ref.name]))
					}
				}))
			};
		}
		/**
		* @deprecated use getSpecs()
		*/
		getSpecsFromResultPool() {
			return this.getSpecs();
		}
		getSpecs() {
			return this.ctx.getSpecsFromResultPool();
		}
		/**
		* @param ref a Ref
		* @returns data associated with the ref
		*/
		getDataByRef(ref) {
			if (typeof this.ctx.getDataFromResultPoolByRef === "undefined") return this.getData().entries.find((f) => f.ref.blockId === ref.blockId && f.ref.name === ref.name)?.obj;
			const data = this.ctx.getDataFromResultPoolByRef(ref.blockId, ref.name);
			if (!data) return void 0;
			return mapPObjectData(data, (handle) => new TreeNodeAccessor(handle, [ref.blockId, ref.name]));
		}
		/**
		* Returns data associated with the ref ensuring that it is a p-column.
		* @param ref a Ref
		* @returns p-column associated with the ref
		*/
		getPColumnByRef(ref) {
			const data = this.getDataByRef(ref);
			if (!data) return void 0;
			return ensurePColumn(data);
		}
		/**
		* Returns spec associated with the ref ensuring that it is a p-column spec.
		* @param ref a Ref
		* @returns p-column spec associated with the ref
		*/
		getPColumnSpecByRef(ref) {
			const spec = this.getSpecByRef(ref);
			if (!spec) return void 0;
			if (!isPColumnSpec(spec)) throw new Error(`not a PColumn spec (kind = ${spec.kind})`);
			return spec;
		}
		/**
		* @param ref a Ref
		* @returns object spec associated with the ref
		*/
		getSpecByRef(ref) {
			return this.ctx.getSpecFromResultPoolByRef(ref.blockId, ref.name);
		}
		/**
		* @param spec object specification
		* @returns array of data objects with compatible specs
		* @deprecated delete this method after Jan 1, 2025
		*/
		findDataWithCompatibleSpec(spec) {
			const result = [];
			out: for (const data of this.getData().entries) {
				if (!isPColumnSpec(data.obj.spec)) continue;
				const oth = data.obj.spec;
				if (spec.name !== oth.name) continue;
				if (spec.valueType !== oth.valueType) continue;
				if (spec.axesSpec.length !== oth.axesSpec.length) continue;
				if (!matchDomain(spec.domain, oth.domain)) continue;
				if (!matchDomain(spec.contextDomain, oth.contextDomain)) continue;
				for (let i = 0; i < spec.axesSpec.length; ++i) {
					const qAx = spec.axesSpec[i];
					const tAx = oth.axesSpec[i];
					if (qAx.name !== tAx.name) continue out;
					if (qAx.type !== tAx.type) continue out;
					if (!matchDomain(qAx.domain, tAx.domain)) continue out;
					if (!matchDomain(qAx.contextDomain, tAx.contextDomain)) continue out;
				}
				result.push(data.obj);
			}
			return result;
		}
		/**
		* Find labels data for a given axis id. It will search for a label column and return its data as a map.
		* @returns a map of axis value => label
		*/
		findLabels(axis) {
			const dataPool = this.getData();
			for (const column of dataPool.entries) {
				if (!isPColumn(column.obj)) continue;
				const spec = column.obj.spec;
				if (spec.name === PColumnName.Label && spec.axesSpec.length === 1 && spec.axesSpec[0].name === axis.name && spec.axesSpec[0].type === axis.type && matchDomain(axis.domain, spec.axesSpec[0].domain) && matchDomain(axis.contextDomain, spec.axesSpec[0].contextDomain)) {
					if (column.obj.data.resourceType.name !== "PColumnData/Json") throw Error(`Expected JSON column for labels, got: ${column.obj.data.resourceType.name}`);
					return Object.fromEntries(Object.entries(column.obj.data.getDataAsJson().data).map((e) => [JSON.parse(e[0])[0], e[1]]));
				}
			}
		}
		/**
		* Selects columns based on the provided selectors, returning PColumn objects
		* with lazily loaded data.
		*
		* @param selectors - A predicate function, a single selector, or an array of selectors.
		* @returns An array of PColumn objects matching the selectors. Data is loaded on first access.
		*/
		selectColumns(selectors) {
			const predicate = typeof selectors === "function" ? selectors : legacyColumnSelectorsToPredicate(selectors);
			return this.getSpecs().entries.filter(({ obj: spec }) => {
				if (!isPColumnSpec(spec)) return false;
				return predicate(spec);
			}).map(({ ref, obj: spec }) => {
				const pcolumnSpec = spec;
				let _cachedData = null;
				const self = this;
				return {
					id: (0, import_canonicalize.default)(ref),
					spec: pcolumnSpec,
					get data() {
						if (_cachedData !== null) return _cachedData;
						_cachedData = self.getPColumnByRef(ref)?.data;
						return _cachedData;
					}
				};
			});
		}
		/**
		* Find labels data for a given axis id of a p-column.
		* @returns a map of axis value => label
		*/
		findLabelsForColumnAxis(column, axisIdx) {
			const labels = this.findLabels(column.axesSpec[axisIdx]);
			if (!labels) return void 0;
			const axisKeys = readAnnotation(column, `pl7.app/axisKeys/${axisIdx}`);
			if (axisKeys !== void 0) {
				const keys = JSON.parse(axisKeys);
				return Object.fromEntries(keys.map((key) => {
					return [key, labels[key] ?? "Unlabelled"];
				}));
			} else return labels;
		}
	};
	/** Main entry point to the API available within model lambdas (like outputs, sections, etc..) */
	var RenderCtxBase = class {
		ctx;
		requiredServiceNames;
		cachedServices;
		constructor(requiredServiceNames = []) {
			this.ctx = getCfgRenderCtx();
			this.requiredServiceNames = requiredServiceNames;
		}
		get services() {
			if (this.cachedServices) return this.cachedServices;
			const ctx = this.ctx;
			const services = Object.freeze(Object.fromEntries(this.requiredServiceNames.map((id) => [id, Object.freeze(Object.fromEntries(ctx.getServiceMethods(id).map((method) => [method, (...args) => ctx.callServiceMethod(id, method, ...args)])))])));
			this.cachedServices = services;
			return services;
		}
		dataCache;
		get data() {
			if (this.dataCache === void 0) {
				const raw = this.ctx.data;
				const value = typeof raw === "function" ? raw() : raw;
				this.dataCache = { v: value ? JSON.parse(value) : {} };
			}
			return this.dataCache.v;
		}
		activeArgsCache;
		/**
		* Returns args snapshot the block was executed for (i.e. when "Run" button was pressed).
		* Returns undefined, if block was never executed or stopped mid-way execution, so that the result was cleared.
		* */
		get activeArgs() {
			if (this.activeArgsCache === void 0) {
				const raw = this.ctx.activeArgs;
				const value = typeof raw === "function" ? raw() : raw;
				this.activeArgsCache = { v: value ? JSON.parse(value) : void 0 };
			}
			return this.activeArgsCache.v;
		}
		getNamedAccessor(name) {
			return ifDef(this.ctx.getAccessorHandleByName(name), (accessor) => new TreeNodeAccessor(accessor, [name]));
		}
		get prerun() {
			return this.getNamedAccessor(StagingAccessorName);
		}
		get outputs() {
			return this.getNamedAccessor(MainAccessorName);
		}
		resultPool = new ResultPool();
		/**
		* Find labels data for a given axis id. It will search for a label column and return its data as a map.
		* @returns a map of axis value => label
		* @deprecated Use resultPool.findLabels instead
		*/
		findLabels(axis) {
			return this.resultPool.findLabels(axis);
		}
		verifyInlineAndExplicitColumnsSupport(columns) {
			const hasInlineColumns = columns.some((c) => !(c.data instanceof TreeNodeAccessor) || isDataInfo(c.data));
			const inlineColumnsSupport = this.ctx.featureFlags?.inlineColumnsSupport === true;
			if (hasInlineColumns && !inlineColumnsSupport) throw Error(`Inline or explicit columns not supported`);
		}
		patchPTableDef(def) {
			if (!this.ctx.featureFlags?.pTablePartitionFiltersSupport) def = {
				...def,
				partitionFilters: [],
				filters: [...def.partitionFilters, ...def.filters]
			};
			if (!this.ctx.featureFlags?.pFrameInSetFilterSupport) def = {
				...def,
				partitionFilters: patchInSetFilters(def.partitionFilters),
				filters: patchInSetFilters(def.filters)
			};
			return def;
		}
		createPFrame(def) {
			if (!allPColumnsReady(def)) return void 0;
			this.verifyInlineAndExplicitColumnsSupport(def);
			return this.ctx.createPFrame(def.map((c) => transformPColumnData(c)));
		}
		createPTable(def) {
			let rawDef;
			if ("columns" in def) rawDef = this.patchPTableDef({
				src: {
					type: "full",
					entries: def.columns.map((c) => ({
						type: "column",
						column: c
					}))
				},
				partitionFilters: def.filters ?? [],
				filters: [],
				sorting: def.sorting ?? []
			});
			else rawDef = this.patchPTableDef(def);
			const columns = extractAllColumns(rawDef.src);
			this.verifyInlineAndExplicitColumnsSupport(columns);
			if (!allPColumnsReady(columns)) return void 0;
			return this.ctx.createPTable(mapPTableDef(rawDef, (po) => transformPColumnData(po)));
		}
		createPTableV2(def) {
			const columns = collectSpecQueryColumns(def.query);
			if (!allPColumnsReady(columns)) return void 0;
			this.verifyInlineAndExplicitColumnsSupport(columns);
			return this.ctx.createPTableV2(mapPTableDefV2(def, (po) => {
				if (po.data === void 0) throw new Error("unreachable: column data undefined after readiness check");
				return transformPColumnData({
					id: po.id,
					spec: po.spec,
					data: po.data
				});
			}));
		}
		/** @deprecated scheduled for removal from SDK */
		getBlockLabel(blockId) {
			return this.ctx.getBlockLabel(blockId);
		}
		getCurrentUnstableMarker() {
			return this.ctx.getCurrentUnstableMarker();
		}
		logInfo(msg) {
			this.ctx.logInfo(msg);
		}
		logWarn(msg) {
			this.ctx.logWarn(msg);
		}
		logError(msg) {
			this.ctx.logError(msg);
		}
	};
	/** Main entry point to the API available within model lambdas (like outputs, sections, etc..) for v3+ blocks */
	var BlockRenderCtx = class extends RenderCtxBase {
		argsCache;
		get args() {
			if (this.argsCache === void 0) {
				const raw = this.ctx.args;
				const value = typeof raw === "function" ? raw() : raw;
				this.argsCache = { v: value === void 0 ? void 0 : JSON.parse(value) };
			}
			return this.argsCache.v;
		}
	};
	/**
	* Render context for plugin output functions.
	* Reads plugin data from blockStorage and derives params from pre-wrapped input callbacks.
	*
	* Parameterized on the factory-like phantom F so that getPluginData returns
	* InferFactoryData<F> directly — no casts needed for the data getter.
	*
	* @typeParam F - PluginFactoryLike phantom carrying data/params/outputs types
	*/
	var PluginRenderCtx = class extends RenderCtxBase {
		handle;
		wrappedInputs;
		constructor(handle, wrappedInputs, requiredServiceNames = []) {
			super(requiredServiceNames);
			this.handle = handle;
			this.wrappedInputs = wrappedInputs;
		}
		pluginDataCache;
		/** Plugin's persistent data from blockStorage.__plugins.{pluginId}.__data */
		get data() {
			if (this.pluginDataCache === void 0) this.pluginDataCache = { v: getPluginData(parseJson(this.ctx.blockStorage()), this.handle) };
			return this.pluginDataCache.v;
		}
		paramsCache;
		/** Params derived from block context via pre-wrapped input callbacks */
		get params() {
			if (this.paramsCache === void 0) {
				const result = {};
				for (const [key, fn] of Object.entries(this.wrappedInputs)) result[key] = fn();
				this.paramsCache = { v: result };
			}
			return this.paramsCache.v;
		}
	};
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/version.js
	const PlatformaSDKVersion = "1.64.0";
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/bconfig/types.js
	function isConfigLambda(cfgOrFh) {
		return cfgOrFh.__renderLambda === true;
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/bconfig/normalization.js
	function downgradeCfgOrLambda(data) {
		if (data === void 0) return void 0;
		if (isConfigLambda(data)) return data.handle;
		return data;
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/services/block_services.js
	/**
	* Services required by all V3 blocks by default.
	* Edit this when a new service should be available to all blocks.
	*
	* Standalone module to avoid circular dependencies between block_model.ts
	* and service type resolution.
	*/
	const BLOCK_SERVICE_FLAGS = { requiresPFrameSpec: true };
	const blockServiceNames = resolveRequiredServices(BLOCK_SERVICE_FLAGS);
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/plugin_model.js
	/** Symbol for internal plugin model creation — not accessible to external consumers */
	const CREATE_PLUGIN_MODEL = Symbol("createPluginModel");
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/block_storage_callbacks.js
	/**
	* BlockStorage Callback Implementations - wired to facade callbacks in BlockModelV3.done().
	*
	* Provides pure functions for storage operations (migration, initialization,
	* args derivation, updates, debug views). Each function takes its dependencies
	* explicitly as parameters.
	*
	* @module block_storage_callbacks
	* @internal
	*/
	/**
	* Normalizes raw storage data and extracts state.
	* Handles all formats:
	* - New BlockStorage format (has discriminator)
	* - Legacy V1/V2 format ({ args, uiState })
	* - Raw V3 state (any other format)
	*
	* @param rawStorage - Raw data from blockStorage field (may be JSON string or object)
	* @returns Object with normalized storage and extracted state
	*/
	function normalizeStorage(rawStorage) {
		if (rawStorage === void 0 || rawStorage === null) return {
			storage: createBlockStorage({}),
			data: {}
		};
		let parsed = rawStorage;
		if (typeof rawStorage === "string") try {
			parsed = JSON.parse(rawStorage);
		} catch {
			return {
				storage: createBlockStorage(rawStorage),
				data: rawStorage
			};
		}
		if (isBlockStorage(parsed)) {
			const storage = normalizeBlockStorage(parsed);
			return {
				storage,
				data: getStorageData(storage)
			};
		}
		if (isLegacyModelV1ApiFormat(parsed)) return {
			storage: createBlockStorage(parsed),
			data: parsed
		};
		return {
			storage: createBlockStorage(parsed),
			data: parsed
		};
	}
	/**
	* Applies a state update to existing storage.
	* Used when setData is called from the frontend.
	*
	* @param currentStorageJson - Current storage as JSON string (must be defined)
	* @param payload - Update payload with operation type and value
	* @returns Updated storage as StringifiedJson<BlockStorage>
	*/
	function applyStorageUpdate(currentStorageJson, payload) {
		const { storage: currentStorage } = normalizeStorage(currentStorageJson);
		return stringifyJson(updateStorageData(currentStorage, payload));
	}
	/**
	* Checks if data is in legacy Model API v1 format.
	* Legacy format has { args, uiState? } at top level without the BlockStorage discriminator.
	*/
	function isLegacyModelV1ApiFormat(data) {
		if (data === null || typeof data !== "object") return false;
		if (isBlockStorage(data)) return false;
		return "args" in data;
	}
	/**
	* Gets storage debug view from raw storage data.
	* Returns structured debug info about the storage state.
	*
	* @param rawStorage - Raw data from blockStorage field (may be JSON string or object)
	* @returns JSON string with storage debug view
	*/
	function getStorageDebugView(rawStorage) {
		const { storage } = normalizeStorage(rawStorage);
		return stringifyJson({
			dataVersion: storage.__dataVersion,
			data: storage.__data
		});
	}
	/**
	* Runs storage migration using the provided hooks.
	* This is the main entry point for the middle layer to trigger migrations.
	*
	* @param currentStorageJson - Current storage as JSON string (or undefined)
	* @param hooks - Migration dependencies (block/plugin data migration and creation functions)
	* @returns MigrationResult
	*/
	function migrateStorage(currentStorageJson, hooks) {
		const { storage: currentStorage } = normalizeStorage(currentStorageJson);
		const newPluginRegistry = hooks.getPluginRegistry();
		const migrationResult = migrateBlockStorage(currentStorage, {
			migrateBlockData: hooks.migrateBlockData,
			migratePluginData: hooks.migratePluginData,
			newPluginRegistry,
			createPluginData: hooks.createPluginData
		});
		if (!migrationResult.success) return { error: `Migration failed at '${migrationResult.failedAt}': ${migrationResult.error}` };
		const oldVersion = currentStorage.__dataVersion;
		const newVersion = migrationResult.storage.__dataVersion;
		const info = oldVersion === newVersion ? `No migration needed (${oldVersion})` : `Migrated ${oldVersion} -> ${newVersion}`;
		return {
			newStorageJson: stringifyJson(migrationResult.storage),
			info
		};
	}
	/**
	* Creates complete initial storage (block data + all plugin data) atomically.
	*
	* @param hooks - Dependencies for creating initial block and plugin data
	* @returns Initial storage as branded JSON string
	* @throws If initialDataFn or createPluginData throws
	*/
	function createInitialStorage(hooks) {
		const blockDefault = hooks.getDefaultBlockData();
		const pluginRegistry = hooks.getPluginRegistry();
		const plugins = {};
		for (const handle of Object.keys(pluginRegistry)) {
			const initial = hooks.createPluginData(handle);
			plugins[handle] = {
				__dataVersion: initial.version,
				__data: initial.data
			};
		}
		return stringifyJson({
			[BLOCK_STORAGE_KEY]: "v1",
			__dataVersion: blockDefault.version,
			__data: blockDefault.data,
			__pluginRegistry: pluginRegistry,
			__plugins: plugins
		});
	}
	/**
	* Derives args from storage using the provided args function.
	* This extracts data from storage and passes it to the block's args() function.
	*
	* @param storageJson - Storage as JSON string
	* @param argsFunction - The block's args derivation function
	* @returns ArgsDeriveResult with derived args or error
	*/
	function deriveArgsFromStorage(storageJson, argsFunction) {
		const { data } = normalizeStorage(storageJson);
		try {
			return { value: argsFunction(data) };
		} catch (e) {
			return { error: `args() threw: ${e instanceof Error ? e.message : String(e)}` };
		}
	}
	/**
	* Derives prerunArgs from storage.
	* Uses prerunArgsFunction if provided, otherwise falls back to argsFunction.
	*
	* @param storageJson - Storage as JSON string
	* @param argsFunction - The block's args derivation function (fallback)
	* @param prerunArgsFunction - Optional prerun args derivation function
	* @returns ArgsDeriveResult with derived prerunArgs or error
	*/
	function derivePrerunArgsFromStorage(storageJson, argsFunction, prerunArgsFunction) {
		const { data } = normalizeStorage(storageJson);
		if (prerunArgsFunction) try {
			return { value: prerunArgsFunction(data) };
		} catch (e) {
			return { error: `prerunArgs() threw: ${e instanceof Error ? e.message : String(e)}` };
		}
		try {
			return { value: argsFunction(data) };
		} catch (e) {
			return { error: `args() threw (fallback): ${e instanceof Error ? e.message : String(e)}` };
		}
	}
	//#endregion
	//#region ../node_modules/.pnpm/@platforma-sdk+model@1.64.0/node_modules/@platforma-sdk/model/dist/block_model.js
	/**
	* Merges two feature flag objects with type-aware logic:
	* - `supports*` (boolean): OR — `true` if either side is `true`
	* - `requires*` (numeric): MAX — take the higher version requirement
	*/
	function mergeFeatureFlags(base, override) {
		const result = { ...base };
		for (const [key, value] of Object.entries(override)) {
			if (value === void 0) continue;
			const existing = result[key];
			if (typeof value === "boolean") result[key] = typeof existing === "boolean" && existing || value;
			else if (typeof value === "number") result[key] = Math.max(typeof existing === "number" ? existing : 0, value);
		}
		return result;
	}
	/** Main entry point that each block should use in it's "config" module. Don't forget
	* to call {@link done()} at the end of configuration. Value returned by this builder must be
	* exported as constant with name "platforma" from the "config" module.
	* API version is 3 (for UI) and 2 (for model) */
	var BlockModelV3 = class BlockModelV3 {
		constructor(config) {
			this.config = config;
		}
		static FEATURE_FLAGS = {
			supportsLazyState: true,
			supportsPframeQueryRanking: true,
			requiresUIAPIVersion: 3,
			requiresModelAPIVersion: 2,
			requiresCreatePTable: 2,
			...BLOCK_SERVICE_FLAGS
		};
		/** @deprecated Use FEATURE_FLAGS */
		static INITIAL_BLOCK_FEATURE_FLAGS = BlockModelV3.FEATURE_FLAGS;
		/**
		* Creates a new BlockModelV3 builder with the specified data model.
		*
		* @example
		* const dataModel = new DataModelBuilder()
		*   .from<BlockData>("v1")
		*   .init(() => ({ numbers: [], labels: [] }));
		*
		* BlockModelV3.create(dataModel)
		*   .args((data) => ({ numbers: data.numbers }))
		*   .sections(() => [{ type: 'link', href: '/', label: 'Main' }])
		*   .done();
		*
		* @param dataModel The data model that defines initial data and migrations
		*/
		static create(dataModel) {
			return new BlockModelV3({
				renderingMode: "Heavy",
				dataModel,
				outputs: {},
				sections: createAndRegisterRenderLambda({
					handle: "sections",
					lambda: () => []
				}, true),
				title: void 0,
				subtitle: void 0,
				tags: void 0,
				enrichmentTargets: void 0,
				featureFlags: { ...BlockModelV3.FEATURE_FLAGS },
				argsFunction: void 0,
				prerunArgsFunction: void 0,
				plugins: {}
			});
		}
		output(key, cfgOrRf, flags = {}) {
			return new BlockModelV3({
				...this.config,
				outputs: {
					...this.config.outputs,
					[key]: createAndRegisterRenderLambda({
						handle: `block-output#${key}`,
						lambda: () => cfgOrRf(new BlockRenderCtx(blockServiceNames)),
						...flags
					})
				}
			});
		}
		/** Shortcut for {@link output} with retentive flag set to true. */
		retentiveOutput(key, rf) {
			return this.output(key, rf, { retentive: true });
		}
		/** Shortcut for {@link output} with withStatus flag set to true. */
		outputWithStatus(key, rf) {
			return this.output(key, rf, { withStatus: true });
		}
		/**
		* Sets a function to derive block args from data.
		* This is called during setData to compute the args that will be used for block execution.
		*
		* @example
		* .args<BlockArgs>((data) => ({ numbers: data.numbers }))
		*
		* @example
		* .args<BlockArgs>((data) => {
		*   if (data.numbers.length === 0) throw new Error('Numbers required'); // block not ready
		*   return { numbers: data.numbers };
		* })
		*/
		args(lambda) {
			return new BlockModelV3({
				...this.config,
				argsFunction: lambda
			});
		}
		/**
		* Sets a function to derive pre-run args from data (optional).
		* This is called during setData to compute the args that will be used for staging/pre-run phase.
		*
		* If not defined, defaults to using the args() function result.
		* If defined, uses its return value for the staging / prerun phase.
		*
		* The staging / prerun phase runs only if currentPrerunArgs differs from the executed
		* version of prerunArgs (same comparison logic as currentArgs vs prodArgs).
		*
		* @example
		* .prerunArgs((data) => ({ numbers: data.numbers }))
		*
		* @example
		* .prerunArgs((data) => {
		*   // Return undefined to skip staging for this block
		*   if (!data.isReady) return undefined;
		*   return { numbers: data.numbers };
		* })
		*/
		prerunArgs(fn) {
			return new BlockModelV3({
				...this.config,
				prerunArgsFunction: fn
			});
		}
		/** Sets the lambda to generate list of sections in the left block overviews panel. */
		sections(rf) {
			return new BlockModelV3({
				...this.config,
				sections: createAndRegisterRenderLambda({
					handle: "sections",
					lambda: () => rf(new BlockRenderCtx(blockServiceNames))
				}, true)
			});
		}
		/** Sets a rendering function to derive block title, shown for the block in the left blocks-overview panel. */
		title(rf) {
			return new BlockModelV3({
				...this.config,
				title: createAndRegisterRenderLambda({
					handle: "title",
					lambda: () => rf(new BlockRenderCtx(blockServiceNames))
				})
			});
		}
		subtitle(rf) {
			return new BlockModelV3({
				...this.config,
				subtitle: createAndRegisterRenderLambda({
					handle: "subtitle",
					lambda: () => rf(new BlockRenderCtx(blockServiceNames))
				})
			});
		}
		tags(rf) {
			return new BlockModelV3({
				...this.config,
				tags: createAndRegisterRenderLambda({
					handle: "tags",
					lambda: () => rf(new BlockRenderCtx(blockServiceNames))
				})
			});
		}
		/** Sets or overrides feature flags for the block. */
		withFeatureFlags(flags) {
			return new BlockModelV3({
				...this.config,
				featureFlags: {
					...this.config.featureFlags,
					...flags
				}
			});
		}
		/**
		* Defines how to derive list of upstream references this block is meant to enrich with its exports from block args.
		* Influences dependency graph construction.
		*/
		enriches(lambda) {
			return new BlockModelV3({
				...this.config,
				enrichmentTargets: createAndRegisterRenderLambda({
					handle: "enrichmentTargets",
					lambda
				})
			});
		}
		plugin(instance, params) {
			const pluginId = instance.id;
			const plugin = instance[CREATE_PLUGIN_MODEL]();
			const resolvedParams = params ?? {};
			if (pluginId in this.config.plugins) throw new Error(`Plugin '${pluginId}' already registered`);
			const registered = {
				model: plugin,
				inputs: resolvedParams
			};
			return new BlockModelV3({
				...this.config,
				plugins: {
					...this.config.plugins,
					[pluginId]: registered
				},
				featureFlags: mergeFeatureFlags(this.config.featureFlags, plugin.featureFlags ?? {})
			});
		}
		/** Renders all provided block settings into a pre-configured platforma API
		* instance, that can be used in frontend to interact with block data, and
		* other features provided by the platforma to the block.
		*
		* Type-level check: if there are unconsumed transfers (from `.transfer()` calls
		* in the migration chain), this method requires an impossible `never` argument,
		* producing a compile error. Register all transferred plugins via `.plugin(instance)`
		* before calling `.done()`.
		*/
		done(..._) {
			if (this.config.argsFunction === void 0) throw new Error("Args rendering function not set.");
			const apiVersion = 3;
			const { plugins } = this.config;
			const pluginRegistry = {};
			const pluginHandles = Object.keys(plugins);
			for (const handle of pluginHandles) pluginRegistry[handle] = plugins[handle].model.name;
			const { dataModel, argsFunction, prerunArgsFunction } = this.config;
			const mergedServiceNames = resolveRequiredServices(this.config.featureFlags);
			function getPlugin(handle) {
				const plugin = plugins[handle];
				if (!plugin) throw new Error(`Plugin model not found for '${handle}'`);
				return plugin;
			}
			registerFacadeCallbacks({
				[BlockStorageFacadeCallbacks.StorageApplyUpdate]: applyStorageUpdate,
				[BlockStorageFacadeCallbacks.StorageDebugView]: getStorageDebugView,
				[BlockStorageFacadeCallbacks.StorageMigrate]: (currentStorageJson) => migrateStorage(currentStorageJson, {
					migrateBlockData: (v) => dataModel.migrate(v),
					getPluginRegistry: () => pluginRegistry,
					migratePluginData: (handle, v) => getPlugin(handle).model.dataModel.migrate(v),
					createPluginData: (handle, transfer) => {
						if (transfer) return transfer;
						return getPlugin(handle).model.getDefaultData();
					}
				}),
				[BlockStorageFacadeCallbacks.StorageInitial]: () => createInitialStorage({
					getDefaultBlockData: () => dataModel.getDefaultData(),
					getPluginRegistry: () => pluginRegistry,
					createPluginData: (handle) => getPlugin(handle).model.getDefaultData()
				}),
				[BlockStorageFacadeCallbacks.ArgsDerive]: (storageJson) => deriveArgsFromStorage(storageJson, argsFunction),
				[BlockStorageFacadeCallbacks.PrerunArgsDerive]: (storageJson) => derivePrerunArgsFromStorage(storageJson, argsFunction, prerunArgsFunction)
			});
			const pluginOutputs = {};
			for (const handle of pluginHandles) {
				const { model, inputs } = plugins[handle];
				const wrappedInputs = {};
				for (const [paramKey, paramFn] of Object.entries(inputs)) wrappedInputs[paramKey] = () => paramFn(new BlockRenderCtx(mergedServiceNames));
				const outputs = model.outputs;
				const { outputFlags } = model;
				for (const [outputKey, outputFn] of Object.entries(outputs)) {
					const key = pluginOutputKey(handle, outputKey);
					pluginOutputs[key] = createAndRegisterRenderLambda({
						handle: key,
						lambda: () => outputFn(new PluginRenderCtx(handle, wrappedInputs, mergedServiceNames)),
						withStatus: outputFlags[outputKey]?.withStatus
					});
				}
			}
			const allOutputs = {
				...this.config.outputs,
				...pluginOutputs
			};
			globalThis.platformaApiVersion = apiVersion;
			if (!isInUI()) return { config: {
				v4: {
					configVersion: 4,
					modelAPIVersion: 2,
					sdkVersion: PlatformaSDKVersion,
					renderingMode: this.config.renderingMode,
					sections: this.config.sections,
					title: this.config.title,
					subtitle: this.config.subtitle,
					tags: this.config.tags,
					outputs: allOutputs,
					enrichmentTargets: this.config.enrichmentTargets,
					featureFlags: this.config.featureFlags,
					blockLifecycleCallbacks: { ...BlockStorageFacadeHandles }
				},
				sdkVersion: PlatformaSDKVersion,
				renderingMode: this.config.renderingMode,
				sections: this.config.sections,
				outputs: Object.fromEntries(Object.entries(this.config.outputs).map(([key, value]) => [key, downgradeCfgOrLambda(value)]))
			} };
			else return {
				...getPlatformaInstance({
					sdkVersion: PlatformaSDKVersion,
					apiVersion
				}),
				blockModelInfo: {
					outputs: Object.fromEntries(Object.entries(allOutputs).map(([key, value]) => [key, { withStatus: Boolean(isConfigLambda(value) && value.withStatus) }])),
					pluginIds: pluginHandles,
					featureFlags: this.config.featureFlags
				}
			};
		}
	};
	(/* @__PURE__ */ __commonJSMin(((exports, module) => {
		exports = module.exports = stringify;
		exports.getSerialize = serializer;
		function stringify(obj, replacer, spaces, cycleReplacer) {
			return JSON.stringify(obj, serializer(replacer, cycleReplacer), spaces);
		}
		function serializer(replacer, cycleReplacer) {
			var stack = [], keys = [];
			if (cycleReplacer == null) cycleReplacer = function(key, value) {
				if (stack[0] === value) return "[Circular ~]";
				return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]";
			};
			return function(key, value) {
				if (stack.length > 0) {
					var thisPos = stack.indexOf(this);
					~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
					~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
					if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value);
				} else stack.push(value);
				return replacer == null ? value : replacer.call(this, key, value);
			};
		}
	})))();
	var util;
	(function(util) {
		util.assertEqual = (val) => val;
		function assertIs(_arg) {}
		util.assertIs = assertIs;
		function assertNever(_x) {
			throw new Error();
		}
		util.assertNever = assertNever;
		util.arrayToEnum = (items) => {
			const obj = {};
			for (const item of items) obj[item] = item;
			return obj;
		};
		util.getValidEnumValues = (obj) => {
			const validKeys = util.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
			const filtered = {};
			for (const k of validKeys) filtered[k] = obj[k];
			return util.objectValues(filtered);
		};
		util.objectValues = (obj) => {
			return util.objectKeys(obj).map(function(e) {
				return obj[e];
			});
		};
		util.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
			const keys = [];
			for (const key in object) if (Object.prototype.hasOwnProperty.call(object, key)) keys.push(key);
			return keys;
		};
		util.find = (arr, checker) => {
			for (const item of arr) if (checker(item)) return item;
		};
		util.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
		function joinValues(array, separator = " | ") {
			return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
		}
		util.joinValues = joinValues;
		util.jsonStringifyReplacer = (_, value) => {
			if (typeof value === "bigint") return value.toString();
			return value;
		};
	})(util || (util = {}));
	var objectUtil;
	(function(objectUtil) {
		objectUtil.mergeShapes = (first, second) => {
			return {
				...first,
				...second
			};
		};
	})(objectUtil || (objectUtil = {}));
	const ZodParsedType = util.arrayToEnum([
		"string",
		"nan",
		"number",
		"integer",
		"float",
		"boolean",
		"date",
		"bigint",
		"symbol",
		"function",
		"undefined",
		"null",
		"array",
		"object",
		"unknown",
		"promise",
		"void",
		"never",
		"map",
		"set"
	]);
	const getParsedType = (data) => {
		switch (typeof data) {
			case "undefined": return ZodParsedType.undefined;
			case "string": return ZodParsedType.string;
			case "number": return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
			case "boolean": return ZodParsedType.boolean;
			case "function": return ZodParsedType.function;
			case "bigint": return ZodParsedType.bigint;
			case "symbol": return ZodParsedType.symbol;
			case "object":
				if (Array.isArray(data)) return ZodParsedType.array;
				if (data === null) return ZodParsedType.null;
				if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") return ZodParsedType.promise;
				if (typeof Map !== "undefined" && data instanceof Map) return ZodParsedType.map;
				if (typeof Set !== "undefined" && data instanceof Set) return ZodParsedType.set;
				if (typeof Date !== "undefined" && data instanceof Date) return ZodParsedType.date;
				return ZodParsedType.object;
			default: return ZodParsedType.unknown;
		}
	};
	const ZodIssueCode = util.arrayToEnum([
		"invalid_type",
		"invalid_literal",
		"custom",
		"invalid_union",
		"invalid_union_discriminator",
		"invalid_enum_value",
		"unrecognized_keys",
		"invalid_arguments",
		"invalid_return_type",
		"invalid_date",
		"invalid_string",
		"too_small",
		"too_big",
		"invalid_intersection_types",
		"not_multiple_of",
		"not_finite"
	]);
	const quotelessJson = (obj) => {
		return JSON.stringify(obj, null, 2).replace(/"([^"]+)":/g, "$1:");
	};
	var ZodError = class ZodError extends Error {
		constructor(issues) {
			super();
			this.issues = [];
			this.addIssue = (sub) => {
				this.issues = [...this.issues, sub];
			};
			this.addIssues = (subs = []) => {
				this.issues = [...this.issues, ...subs];
			};
			const actualProto = new.target.prototype;
			if (Object.setPrototypeOf) Object.setPrototypeOf(this, actualProto);
			else this.__proto__ = actualProto;
			this.name = "ZodError";
			this.issues = issues;
		}
		get errors() {
			return this.issues;
		}
		format(_mapper) {
			const mapper = _mapper || function(issue) {
				return issue.message;
			};
			const fieldErrors = { _errors: [] };
			const processError = (error) => {
				for (const issue of error.issues) if (issue.code === "invalid_union") issue.unionErrors.map(processError);
				else if (issue.code === "invalid_return_type") processError(issue.returnTypeError);
				else if (issue.code === "invalid_arguments") processError(issue.argumentsError);
				else if (issue.path.length === 0) fieldErrors._errors.push(mapper(issue));
				else {
					let curr = fieldErrors;
					let i = 0;
					while (i < issue.path.length) {
						const el = issue.path[i];
						if (!(i === issue.path.length - 1)) curr[el] = curr[el] || { _errors: [] };
						else {
							curr[el] = curr[el] || { _errors: [] };
							curr[el]._errors.push(mapper(issue));
						}
						curr = curr[el];
						i++;
					}
				}
			};
			processError(this);
			return fieldErrors;
		}
		static assert(value) {
			if (!(value instanceof ZodError)) throw new Error(`Not a ZodError: ${value}`);
		}
		toString() {
			return this.message;
		}
		get message() {
			return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
		}
		get isEmpty() {
			return this.issues.length === 0;
		}
		flatten(mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of this.issues) if (sub.path.length > 0) {
				fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
				fieldErrors[sub.path[0]].push(mapper(sub));
			} else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		get formErrors() {
			return this.flatten();
		}
	};
	ZodError.create = (issues) => {
		return new ZodError(issues);
	};
	const errorMap = (issue, _ctx) => {
		let message;
		switch (issue.code) {
			case ZodIssueCode.invalid_type:
				if (issue.received === ZodParsedType.undefined) message = "Required";
				else message = `Expected ${issue.expected}, received ${issue.received}`;
				break;
			case ZodIssueCode.invalid_literal:
				message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
				break;
			case ZodIssueCode.unrecognized_keys:
				message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
				break;
			case ZodIssueCode.invalid_union:
				message = `Invalid input`;
				break;
			case ZodIssueCode.invalid_union_discriminator:
				message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
				break;
			case ZodIssueCode.invalid_enum_value:
				message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
				break;
			case ZodIssueCode.invalid_arguments:
				message = `Invalid function arguments`;
				break;
			case ZodIssueCode.invalid_return_type:
				message = `Invalid function return type`;
				break;
			case ZodIssueCode.invalid_date:
				message = `Invalid date`;
				break;
			case ZodIssueCode.invalid_string:
				if (typeof issue.validation === "object") if ("includes" in issue.validation) {
					message = `Invalid input: must include "${issue.validation.includes}"`;
					if (typeof issue.validation.position === "number") message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
				} else if ("startsWith" in issue.validation) message = `Invalid input: must start with "${issue.validation.startsWith}"`;
				else if ("endsWith" in issue.validation) message = `Invalid input: must end with "${issue.validation.endsWith}"`;
				else util.assertNever(issue.validation);
				else if (issue.validation !== "regex") message = `Invalid ${issue.validation}`;
				else message = "Invalid";
				break;
			case ZodIssueCode.too_small:
				if (issue.type === "array") message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
				else if (issue.type === "string") message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
				else if (issue.type === "number") message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
				else if (issue.type === "date") message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
				else message = "Invalid input";
				break;
			case ZodIssueCode.too_big:
				if (issue.type === "array") message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
				else if (issue.type === "string") message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
				else if (issue.type === "number") message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
				else if (issue.type === "bigint") message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
				else if (issue.type === "date") message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
				else message = "Invalid input";
				break;
			case ZodIssueCode.custom:
				message = `Invalid input`;
				break;
			case ZodIssueCode.invalid_intersection_types:
				message = `Intersection results could not be merged`;
				break;
			case ZodIssueCode.not_multiple_of:
				message = `Number must be a multiple of ${issue.multipleOf}`;
				break;
			case ZodIssueCode.not_finite:
				message = "Number must be finite";
				break;
			default:
				message = _ctx.defaultError;
				util.assertNever(issue);
		}
		return { message };
	};
	let overrideErrorMap = errorMap;
	function setErrorMap(map) {
		overrideErrorMap = map;
	}
	function getErrorMap() {
		return overrideErrorMap;
	}
	const makeIssue = (params) => {
		const { data, path, errorMaps, issueData } = params;
		const fullPath = [...path, ...issueData.path || []];
		const fullIssue = {
			...issueData,
			path: fullPath
		};
		if (issueData.message !== void 0) return {
			...issueData,
			path: fullPath,
			message: issueData.message
		};
		let errorMessage = "";
		const maps = errorMaps.filter((m) => !!m).slice().reverse();
		for (const map of maps) errorMessage = map(fullIssue, {
			data,
			defaultError: errorMessage
		}).message;
		return {
			...issueData,
			path: fullPath,
			message: errorMessage
		};
	};
	const EMPTY_PATH = [];
	function addIssueToContext(ctx, issueData) {
		const overrideMap = getErrorMap();
		const issue = makeIssue({
			issueData,
			data: ctx.data,
			path: ctx.path,
			errorMaps: [
				ctx.common.contextualErrorMap,
				ctx.schemaErrorMap,
				overrideMap,
				overrideMap === errorMap ? void 0 : errorMap
			].filter((x) => !!x)
		});
		ctx.common.issues.push(issue);
	}
	var ParseStatus = class ParseStatus {
		constructor() {
			this.value = "valid";
		}
		dirty() {
			if (this.value === "valid") this.value = "dirty";
		}
		abort() {
			if (this.value !== "aborted") this.value = "aborted";
		}
		static mergeArray(status, results) {
			const arrayValue = [];
			for (const s of results) {
				if (s.status === "aborted") return INVALID;
				if (s.status === "dirty") status.dirty();
				arrayValue.push(s.value);
			}
			return {
				status: status.value,
				value: arrayValue
			};
		}
		static async mergeObjectAsync(status, pairs) {
			const syncPairs = [];
			for (const pair of pairs) {
				const key = await pair.key;
				const value = await pair.value;
				syncPairs.push({
					key,
					value
				});
			}
			return ParseStatus.mergeObjectSync(status, syncPairs);
		}
		static mergeObjectSync(status, pairs) {
			const finalObject = {};
			for (const pair of pairs) {
				const { key, value } = pair;
				if (key.status === "aborted") return INVALID;
				if (value.status === "aborted") return INVALID;
				if (key.status === "dirty") status.dirty();
				if (value.status === "dirty") status.dirty();
				if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) finalObject[key.value] = value.value;
			}
			return {
				status: status.value,
				value: finalObject
			};
		}
	};
	const INVALID = Object.freeze({ status: "aborted" });
	const DIRTY = (value) => ({
		status: "dirty",
		value
	});
	const OK = (value) => ({
		status: "valid",
		value
	});
	const isAborted = (x) => x.status === "aborted";
	const isDirty = (x) => x.status === "dirty";
	const isValid = (x) => x.status === "valid";
	const isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
	/******************************************************************************
	Copyright (c) Microsoft Corporation.
	
	Permission to use, copy, modify, and/or distribute this software for any
	purpose with or without fee is hereby granted.
	
	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
	REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
	AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
	INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
	OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
	PERFORMANCE OF THIS SOFTWARE.
	***************************************************************************** */
	function __classPrivateFieldGet(receiver, state, kind, f) {
		if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
		if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
		return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
	}
	function __classPrivateFieldSet(receiver, state, value, kind, f) {
		if (kind === "m") throw new TypeError("Private method is not writable");
		if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
		if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
		return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
	}
	var errorUtil;
	(function(errorUtil) {
		errorUtil.errToObj = (message) => typeof message === "string" ? { message } : message || {};
		errorUtil.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
	})(errorUtil || (errorUtil = {}));
	var _ZodEnum_cache, _ZodNativeEnum_cache;
	var ParseInputLazyPath = class {
		constructor(parent, value, path, key) {
			this._cachedPath = [];
			this.parent = parent;
			this.data = value;
			this._path = path;
			this._key = key;
		}
		get path() {
			if (!this._cachedPath.length) if (this._key instanceof Array) this._cachedPath.push(...this._path, ...this._key);
			else this._cachedPath.push(...this._path, this._key);
			return this._cachedPath;
		}
	};
	const handleResult = (ctx, result) => {
		if (isValid(result)) return {
			success: true,
			data: result.value
		};
		else {
			if (!ctx.common.issues.length) throw new Error("Validation failed but no issues detected.");
			return {
				success: false,
				get error() {
					if (this._error) return this._error;
					const error = new ZodError(ctx.common.issues);
					this._error = error;
					return this._error;
				}
			};
		}
	};
	function processCreateParams(params) {
		if (!params) return {};
		const { errorMap, invalid_type_error, required_error, description } = params;
		if (errorMap && (invalid_type_error || required_error)) throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
		if (errorMap) return {
			errorMap,
			description
		};
		const customMap = (iss, ctx) => {
			var _a, _b;
			const { message } = params;
			if (iss.code === "invalid_enum_value") return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
			if (typeof ctx.data === "undefined") return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
			if (iss.code !== "invalid_type") return { message: ctx.defaultError };
			return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
		};
		return {
			errorMap: customMap,
			description
		};
	}
	var ZodType = class {
		constructor(def) {
			/** Alias of safeParseAsync */
			this.spa = this.safeParseAsync;
			this._def = def;
			this.parse = this.parse.bind(this);
			this.safeParse = this.safeParse.bind(this);
			this.parseAsync = this.parseAsync.bind(this);
			this.safeParseAsync = this.safeParseAsync.bind(this);
			this.spa = this.spa.bind(this);
			this.refine = this.refine.bind(this);
			this.refinement = this.refinement.bind(this);
			this.superRefine = this.superRefine.bind(this);
			this.optional = this.optional.bind(this);
			this.nullable = this.nullable.bind(this);
			this.nullish = this.nullish.bind(this);
			this.array = this.array.bind(this);
			this.promise = this.promise.bind(this);
			this.or = this.or.bind(this);
			this.and = this.and.bind(this);
			this.transform = this.transform.bind(this);
			this.brand = this.brand.bind(this);
			this.default = this.default.bind(this);
			this.catch = this.catch.bind(this);
			this.describe = this.describe.bind(this);
			this.pipe = this.pipe.bind(this);
			this.readonly = this.readonly.bind(this);
			this.isNullable = this.isNullable.bind(this);
			this.isOptional = this.isOptional.bind(this);
		}
		get description() {
			return this._def.description;
		}
		_getType(input) {
			return getParsedType(input.data);
		}
		_getOrReturnCtx(input, ctx) {
			return ctx || {
				common: input.parent.common,
				data: input.data,
				parsedType: getParsedType(input.data),
				schemaErrorMap: this._def.errorMap,
				path: input.path,
				parent: input.parent
			};
		}
		_processInputParams(input) {
			return {
				status: new ParseStatus(),
				ctx: {
					common: input.parent.common,
					data: input.data,
					parsedType: getParsedType(input.data),
					schemaErrorMap: this._def.errorMap,
					path: input.path,
					parent: input.parent
				}
			};
		}
		_parseSync(input) {
			const result = this._parse(input);
			if (isAsync(result)) throw new Error("Synchronous parse encountered promise.");
			return result;
		}
		_parseAsync(input) {
			const result = this._parse(input);
			return Promise.resolve(result);
		}
		parse(data, params) {
			const result = this.safeParse(data, params);
			if (result.success) return result.data;
			throw result.error;
		}
		safeParse(data, params) {
			var _a;
			const ctx = {
				common: {
					issues: [],
					async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
					contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap
				},
				path: (params === null || params === void 0 ? void 0 : params.path) || [],
				schemaErrorMap: this._def.errorMap,
				parent: null,
				data,
				parsedType: getParsedType(data)
			};
			return handleResult(ctx, this._parseSync({
				data,
				path: ctx.path,
				parent: ctx
			}));
		}
		async parseAsync(data, params) {
			const result = await this.safeParseAsync(data, params);
			if (result.success) return result.data;
			throw result.error;
		}
		async safeParseAsync(data, params) {
			const ctx = {
				common: {
					issues: [],
					contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
					async: true
				},
				path: (params === null || params === void 0 ? void 0 : params.path) || [],
				schemaErrorMap: this._def.errorMap,
				parent: null,
				data,
				parsedType: getParsedType(data)
			};
			const maybeAsyncResult = this._parse({
				data,
				path: ctx.path,
				parent: ctx
			});
			return handleResult(ctx, await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult)));
		}
		refine(check, message) {
			const getIssueProperties = (val) => {
				if (typeof message === "string" || typeof message === "undefined") return { message };
				else if (typeof message === "function") return message(val);
				else return message;
			};
			return this._refinement((val, ctx) => {
				const result = check(val);
				const setError = () => ctx.addIssue({
					code: ZodIssueCode.custom,
					...getIssueProperties(val)
				});
				if (typeof Promise !== "undefined" && result instanceof Promise) return result.then((data) => {
					if (!data) {
						setError();
						return false;
					} else return true;
				});
				if (!result) {
					setError();
					return false;
				} else return true;
			});
		}
		refinement(check, refinementData) {
			return this._refinement((val, ctx) => {
				if (!check(val)) {
					ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
					return false;
				} else return true;
			});
		}
		_refinement(refinement) {
			return new ZodEffects({
				schema: this,
				typeName: ZodFirstPartyTypeKind.ZodEffects,
				effect: {
					type: "refinement",
					refinement
				}
			});
		}
		superRefine(refinement) {
			return this._refinement(refinement);
		}
		optional() {
			return ZodOptional.create(this, this._def);
		}
		nullable() {
			return ZodNullable.create(this, this._def);
		}
		nullish() {
			return this.nullable().optional();
		}
		array() {
			return ZodArray.create(this, this._def);
		}
		promise() {
			return ZodPromise.create(this, this._def);
		}
		or(option) {
			return ZodUnion.create([this, option], this._def);
		}
		and(incoming) {
			return ZodIntersection.create(this, incoming, this._def);
		}
		transform(transform) {
			return new ZodEffects({
				...processCreateParams(this._def),
				schema: this,
				typeName: ZodFirstPartyTypeKind.ZodEffects,
				effect: {
					type: "transform",
					transform
				}
			});
		}
		default(def) {
			const defaultValueFunc = typeof def === "function" ? def : () => def;
			return new ZodDefault({
				...processCreateParams(this._def),
				innerType: this,
				defaultValue: defaultValueFunc,
				typeName: ZodFirstPartyTypeKind.ZodDefault
			});
		}
		brand() {
			return new ZodBranded({
				typeName: ZodFirstPartyTypeKind.ZodBranded,
				type: this,
				...processCreateParams(this._def)
			});
		}
		catch(def) {
			const catchValueFunc = typeof def === "function" ? def : () => def;
			return new ZodCatch({
				...processCreateParams(this._def),
				innerType: this,
				catchValue: catchValueFunc,
				typeName: ZodFirstPartyTypeKind.ZodCatch
			});
		}
		describe(description) {
			const This = this.constructor;
			return new This({
				...this._def,
				description
			});
		}
		pipe(target) {
			return ZodPipeline.create(this, target);
		}
		readonly() {
			return ZodReadonly.create(this);
		}
		isOptional() {
			return this.safeParse(void 0).success;
		}
		isNullable() {
			return this.safeParse(null).success;
		}
	};
	const cuidRegex = /^c[^\s-]{8,}$/i;
	const cuid2Regex = /^[0-9a-z]+$/;
	const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;
	const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
	const nanoidRegex = /^[a-z0-9_-]{21}$/i;
	const durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
	const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
	const _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
	let emojiRegex;
	const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
	const ipv6Regex = /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/;
	const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
	const dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
	const dateRegex = new RegExp(`^${dateRegexSource}$`);
	function timeRegexSource(args) {
		let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
		if (args.precision) regex = `${regex}\\.\\d{${args.precision}}`;
		else if (args.precision == null) regex = `${regex}(\\.\\d+)?`;
		return regex;
	}
	function timeRegex(args) {
		return new RegExp(`^${timeRegexSource(args)}$`);
	}
	function datetimeRegex(args) {
		let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
		const opts = [];
		opts.push(args.local ? `Z?` : `Z`);
		if (args.offset) opts.push(`([+-]\\d{2}:?\\d{2})`);
		regex = `${regex}(${opts.join("|")})`;
		return new RegExp(`^${regex}$`);
	}
	function isValidIP(ip, version) {
		if ((version === "v4" || !version) && ipv4Regex.test(ip)) return true;
		if ((version === "v6" || !version) && ipv6Regex.test(ip)) return true;
		return false;
	}
	var ZodString = class ZodString extends ZodType {
		_parse(input) {
			if (this._def.coerce) input.data = String(input.data);
			if (this._getType(input) !== ZodParsedType.string) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.string,
					received: ctx.parsedType
				});
				return INVALID;
			}
			const status = new ParseStatus();
			let ctx = void 0;
			for (const check of this._def.checks) if (check.kind === "min") {
				if (input.data.length < check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_small,
						minimum: check.value,
						type: "string",
						inclusive: true,
						exact: false,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "max") {
				if (input.data.length > check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_big,
						maximum: check.value,
						type: "string",
						inclusive: true,
						exact: false,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "length") {
				const tooBig = input.data.length > check.value;
				const tooSmall = input.data.length < check.value;
				if (tooBig || tooSmall) {
					ctx = this._getOrReturnCtx(input, ctx);
					if (tooBig) addIssueToContext(ctx, {
						code: ZodIssueCode.too_big,
						maximum: check.value,
						type: "string",
						inclusive: true,
						exact: true,
						message: check.message
					});
					else if (tooSmall) addIssueToContext(ctx, {
						code: ZodIssueCode.too_small,
						minimum: check.value,
						type: "string",
						inclusive: true,
						exact: true,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "email") {
				if (!emailRegex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "email",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "emoji") {
				if (!emojiRegex) emojiRegex = new RegExp(_emojiRegex, "u");
				if (!emojiRegex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "emoji",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "uuid") {
				if (!uuidRegex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "uuid",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "nanoid") {
				if (!nanoidRegex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "nanoid",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "cuid") {
				if (!cuidRegex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "cuid",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "cuid2") {
				if (!cuid2Regex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "cuid2",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "ulid") {
				if (!ulidRegex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "ulid",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "url") try {
				new URL(input.data);
			} catch (_a) {
				ctx = this._getOrReturnCtx(input, ctx);
				addIssueToContext(ctx, {
					validation: "url",
					code: ZodIssueCode.invalid_string,
					message: check.message
				});
				status.dirty();
			}
			else if (check.kind === "regex") {
				check.regex.lastIndex = 0;
				if (!check.regex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "regex",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "trim") input.data = input.data.trim();
			else if (check.kind === "includes") {
				if (!input.data.includes(check.value, check.position)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_string,
						validation: {
							includes: check.value,
							position: check.position
						},
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "toLowerCase") input.data = input.data.toLowerCase();
			else if (check.kind === "toUpperCase") input.data = input.data.toUpperCase();
			else if (check.kind === "startsWith") {
				if (!input.data.startsWith(check.value)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_string,
						validation: { startsWith: check.value },
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "endsWith") {
				if (!input.data.endsWith(check.value)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_string,
						validation: { endsWith: check.value },
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "datetime") {
				if (!datetimeRegex(check).test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_string,
						validation: "datetime",
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "date") {
				if (!dateRegex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_string,
						validation: "date",
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "time") {
				if (!timeRegex(check).test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_string,
						validation: "time",
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "duration") {
				if (!durationRegex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "duration",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "ip") {
				if (!isValidIP(input.data, check.version)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "ip",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "base64") {
				if (!base64Regex.test(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "base64",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
			} else util.assertNever(check);
			return {
				status: status.value,
				value: input.data
			};
		}
		_regex(regex, validation, message) {
			return this.refinement((data) => regex.test(data), {
				validation,
				code: ZodIssueCode.invalid_string,
				...errorUtil.errToObj(message)
			});
		}
		_addCheck(check) {
			return new ZodString({
				...this._def,
				checks: [...this._def.checks, check]
			});
		}
		email(message) {
			return this._addCheck({
				kind: "email",
				...errorUtil.errToObj(message)
			});
		}
		url(message) {
			return this._addCheck({
				kind: "url",
				...errorUtil.errToObj(message)
			});
		}
		emoji(message) {
			return this._addCheck({
				kind: "emoji",
				...errorUtil.errToObj(message)
			});
		}
		uuid(message) {
			return this._addCheck({
				kind: "uuid",
				...errorUtil.errToObj(message)
			});
		}
		nanoid(message) {
			return this._addCheck({
				kind: "nanoid",
				...errorUtil.errToObj(message)
			});
		}
		cuid(message) {
			return this._addCheck({
				kind: "cuid",
				...errorUtil.errToObj(message)
			});
		}
		cuid2(message) {
			return this._addCheck({
				kind: "cuid2",
				...errorUtil.errToObj(message)
			});
		}
		ulid(message) {
			return this._addCheck({
				kind: "ulid",
				...errorUtil.errToObj(message)
			});
		}
		base64(message) {
			return this._addCheck({
				kind: "base64",
				...errorUtil.errToObj(message)
			});
		}
		ip(options) {
			return this._addCheck({
				kind: "ip",
				...errorUtil.errToObj(options)
			});
		}
		datetime(options) {
			var _a, _b;
			if (typeof options === "string") return this._addCheck({
				kind: "datetime",
				precision: null,
				offset: false,
				local: false,
				message: options
			});
			return this._addCheck({
				kind: "datetime",
				precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
				offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
				local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
				...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
			});
		}
		date(message) {
			return this._addCheck({
				kind: "date",
				message
			});
		}
		time(options) {
			if (typeof options === "string") return this._addCheck({
				kind: "time",
				precision: null,
				message: options
			});
			return this._addCheck({
				kind: "time",
				precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
				...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
			});
		}
		duration(message) {
			return this._addCheck({
				kind: "duration",
				...errorUtil.errToObj(message)
			});
		}
		regex(regex, message) {
			return this._addCheck({
				kind: "regex",
				regex,
				...errorUtil.errToObj(message)
			});
		}
		includes(value, options) {
			return this._addCheck({
				kind: "includes",
				value,
				position: options === null || options === void 0 ? void 0 : options.position,
				...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
			});
		}
		startsWith(value, message) {
			return this._addCheck({
				kind: "startsWith",
				value,
				...errorUtil.errToObj(message)
			});
		}
		endsWith(value, message) {
			return this._addCheck({
				kind: "endsWith",
				value,
				...errorUtil.errToObj(message)
			});
		}
		min(minLength, message) {
			return this._addCheck({
				kind: "min",
				value: minLength,
				...errorUtil.errToObj(message)
			});
		}
		max(maxLength, message) {
			return this._addCheck({
				kind: "max",
				value: maxLength,
				...errorUtil.errToObj(message)
			});
		}
		length(len, message) {
			return this._addCheck({
				kind: "length",
				value: len,
				...errorUtil.errToObj(message)
			});
		}
		/**
		* @deprecated Use z.string().min(1) instead.
		* @see {@link ZodString.min}
		*/
		nonempty(message) {
			return this.min(1, errorUtil.errToObj(message));
		}
		trim() {
			return new ZodString({
				...this._def,
				checks: [...this._def.checks, { kind: "trim" }]
			});
		}
		toLowerCase() {
			return new ZodString({
				...this._def,
				checks: [...this._def.checks, { kind: "toLowerCase" }]
			});
		}
		toUpperCase() {
			return new ZodString({
				...this._def,
				checks: [...this._def.checks, { kind: "toUpperCase" }]
			});
		}
		get isDatetime() {
			return !!this._def.checks.find((ch) => ch.kind === "datetime");
		}
		get isDate() {
			return !!this._def.checks.find((ch) => ch.kind === "date");
		}
		get isTime() {
			return !!this._def.checks.find((ch) => ch.kind === "time");
		}
		get isDuration() {
			return !!this._def.checks.find((ch) => ch.kind === "duration");
		}
		get isEmail() {
			return !!this._def.checks.find((ch) => ch.kind === "email");
		}
		get isURL() {
			return !!this._def.checks.find((ch) => ch.kind === "url");
		}
		get isEmoji() {
			return !!this._def.checks.find((ch) => ch.kind === "emoji");
		}
		get isUUID() {
			return !!this._def.checks.find((ch) => ch.kind === "uuid");
		}
		get isNANOID() {
			return !!this._def.checks.find((ch) => ch.kind === "nanoid");
		}
		get isCUID() {
			return !!this._def.checks.find((ch) => ch.kind === "cuid");
		}
		get isCUID2() {
			return !!this._def.checks.find((ch) => ch.kind === "cuid2");
		}
		get isULID() {
			return !!this._def.checks.find((ch) => ch.kind === "ulid");
		}
		get isIP() {
			return !!this._def.checks.find((ch) => ch.kind === "ip");
		}
		get isBase64() {
			return !!this._def.checks.find((ch) => ch.kind === "base64");
		}
		get minLength() {
			let min = null;
			for (const ch of this._def.checks) if (ch.kind === "min") {
				if (min === null || ch.value > min) min = ch.value;
			}
			return min;
		}
		get maxLength() {
			let max = null;
			for (const ch of this._def.checks) if (ch.kind === "max") {
				if (max === null || ch.value < max) max = ch.value;
			}
			return max;
		}
	};
	ZodString.create = (params) => {
		var _a;
		return new ZodString({
			checks: [],
			typeName: ZodFirstPartyTypeKind.ZodString,
			coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
			...processCreateParams(params)
		});
	};
	function floatSafeRemainder(val, step) {
		const valDecCount = (val.toString().split(".")[1] || "").length;
		const stepDecCount = (step.toString().split(".")[1] || "").length;
		const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
		return parseInt(val.toFixed(decCount).replace(".", "")) % parseInt(step.toFixed(decCount).replace(".", "")) / Math.pow(10, decCount);
	}
	var ZodNumber = class ZodNumber extends ZodType {
		constructor() {
			super(...arguments);
			this.min = this.gte;
			this.max = this.lte;
			this.step = this.multipleOf;
		}
		_parse(input) {
			if (this._def.coerce) input.data = Number(input.data);
			if (this._getType(input) !== ZodParsedType.number) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.number,
					received: ctx.parsedType
				});
				return INVALID;
			}
			let ctx = void 0;
			const status = new ParseStatus();
			for (const check of this._def.checks) if (check.kind === "int") {
				if (!util.isInteger(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: "integer",
						received: "float",
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "min") {
				if (check.inclusive ? input.data < check.value : input.data <= check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_small,
						minimum: check.value,
						type: "number",
						inclusive: check.inclusive,
						exact: false,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "max") {
				if (check.inclusive ? input.data > check.value : input.data >= check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_big,
						maximum: check.value,
						type: "number",
						inclusive: check.inclusive,
						exact: false,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "multipleOf") {
				if (floatSafeRemainder(input.data, check.value) !== 0) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.not_multiple_of,
						multipleOf: check.value,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "finite") {
				if (!Number.isFinite(input.data)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.not_finite,
						message: check.message
					});
					status.dirty();
				}
			} else util.assertNever(check);
			return {
				status: status.value,
				value: input.data
			};
		}
		gte(value, message) {
			return this.setLimit("min", value, true, errorUtil.toString(message));
		}
		gt(value, message) {
			return this.setLimit("min", value, false, errorUtil.toString(message));
		}
		lte(value, message) {
			return this.setLimit("max", value, true, errorUtil.toString(message));
		}
		lt(value, message) {
			return this.setLimit("max", value, false, errorUtil.toString(message));
		}
		setLimit(kind, value, inclusive, message) {
			return new ZodNumber({
				...this._def,
				checks: [...this._def.checks, {
					kind,
					value,
					inclusive,
					message: errorUtil.toString(message)
				}]
			});
		}
		_addCheck(check) {
			return new ZodNumber({
				...this._def,
				checks: [...this._def.checks, check]
			});
		}
		int(message) {
			return this._addCheck({
				kind: "int",
				message: errorUtil.toString(message)
			});
		}
		positive(message) {
			return this._addCheck({
				kind: "min",
				value: 0,
				inclusive: false,
				message: errorUtil.toString(message)
			});
		}
		negative(message) {
			return this._addCheck({
				kind: "max",
				value: 0,
				inclusive: false,
				message: errorUtil.toString(message)
			});
		}
		nonpositive(message) {
			return this._addCheck({
				kind: "max",
				value: 0,
				inclusive: true,
				message: errorUtil.toString(message)
			});
		}
		nonnegative(message) {
			return this._addCheck({
				kind: "min",
				value: 0,
				inclusive: true,
				message: errorUtil.toString(message)
			});
		}
		multipleOf(value, message) {
			return this._addCheck({
				kind: "multipleOf",
				value,
				message: errorUtil.toString(message)
			});
		}
		finite(message) {
			return this._addCheck({
				kind: "finite",
				message: errorUtil.toString(message)
			});
		}
		safe(message) {
			return this._addCheck({
				kind: "min",
				inclusive: true,
				value: Number.MIN_SAFE_INTEGER,
				message: errorUtil.toString(message)
			})._addCheck({
				kind: "max",
				inclusive: true,
				value: Number.MAX_SAFE_INTEGER,
				message: errorUtil.toString(message)
			});
		}
		get minValue() {
			let min = null;
			for (const ch of this._def.checks) if (ch.kind === "min") {
				if (min === null || ch.value > min) min = ch.value;
			}
			return min;
		}
		get maxValue() {
			let max = null;
			for (const ch of this._def.checks) if (ch.kind === "max") {
				if (max === null || ch.value < max) max = ch.value;
			}
			return max;
		}
		get isInt() {
			return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
		}
		get isFinite() {
			let max = null, min = null;
			for (const ch of this._def.checks) if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") return true;
			else if (ch.kind === "min") {
				if (min === null || ch.value > min) min = ch.value;
			} else if (ch.kind === "max") {
				if (max === null || ch.value < max) max = ch.value;
			}
			return Number.isFinite(min) && Number.isFinite(max);
		}
	};
	ZodNumber.create = (params) => {
		return new ZodNumber({
			checks: [],
			typeName: ZodFirstPartyTypeKind.ZodNumber,
			coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
			...processCreateParams(params)
		});
	};
	var ZodBigInt = class ZodBigInt extends ZodType {
		constructor() {
			super(...arguments);
			this.min = this.gte;
			this.max = this.lte;
		}
		_parse(input) {
			if (this._def.coerce) input.data = BigInt(input.data);
			if (this._getType(input) !== ZodParsedType.bigint) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.bigint,
					received: ctx.parsedType
				});
				return INVALID;
			}
			let ctx = void 0;
			const status = new ParseStatus();
			for (const check of this._def.checks) if (check.kind === "min") {
				if (check.inclusive ? input.data < check.value : input.data <= check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_small,
						type: "bigint",
						minimum: check.value,
						inclusive: check.inclusive,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "max") {
				if (check.inclusive ? input.data > check.value : input.data >= check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_big,
						type: "bigint",
						maximum: check.value,
						inclusive: check.inclusive,
						message: check.message
					});
					status.dirty();
				}
			} else if (check.kind === "multipleOf") {
				if (input.data % check.value !== BigInt(0)) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.not_multiple_of,
						multipleOf: check.value,
						message: check.message
					});
					status.dirty();
				}
			} else util.assertNever(check);
			return {
				status: status.value,
				value: input.data
			};
		}
		gte(value, message) {
			return this.setLimit("min", value, true, errorUtil.toString(message));
		}
		gt(value, message) {
			return this.setLimit("min", value, false, errorUtil.toString(message));
		}
		lte(value, message) {
			return this.setLimit("max", value, true, errorUtil.toString(message));
		}
		lt(value, message) {
			return this.setLimit("max", value, false, errorUtil.toString(message));
		}
		setLimit(kind, value, inclusive, message) {
			return new ZodBigInt({
				...this._def,
				checks: [...this._def.checks, {
					kind,
					value,
					inclusive,
					message: errorUtil.toString(message)
				}]
			});
		}
		_addCheck(check) {
			return new ZodBigInt({
				...this._def,
				checks: [...this._def.checks, check]
			});
		}
		positive(message) {
			return this._addCheck({
				kind: "min",
				value: BigInt(0),
				inclusive: false,
				message: errorUtil.toString(message)
			});
		}
		negative(message) {
			return this._addCheck({
				kind: "max",
				value: BigInt(0),
				inclusive: false,
				message: errorUtil.toString(message)
			});
		}
		nonpositive(message) {
			return this._addCheck({
				kind: "max",
				value: BigInt(0),
				inclusive: true,
				message: errorUtil.toString(message)
			});
		}
		nonnegative(message) {
			return this._addCheck({
				kind: "min",
				value: BigInt(0),
				inclusive: true,
				message: errorUtil.toString(message)
			});
		}
		multipleOf(value, message) {
			return this._addCheck({
				kind: "multipleOf",
				value,
				message: errorUtil.toString(message)
			});
		}
		get minValue() {
			let min = null;
			for (const ch of this._def.checks) if (ch.kind === "min") {
				if (min === null || ch.value > min) min = ch.value;
			}
			return min;
		}
		get maxValue() {
			let max = null;
			for (const ch of this._def.checks) if (ch.kind === "max") {
				if (max === null || ch.value < max) max = ch.value;
			}
			return max;
		}
	};
	ZodBigInt.create = (params) => {
		var _a;
		return new ZodBigInt({
			checks: [],
			typeName: ZodFirstPartyTypeKind.ZodBigInt,
			coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
			...processCreateParams(params)
		});
	};
	var ZodBoolean = class extends ZodType {
		_parse(input) {
			if (this._def.coerce) input.data = Boolean(input.data);
			if (this._getType(input) !== ZodParsedType.boolean) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.boolean,
					received: ctx.parsedType
				});
				return INVALID;
			}
			return OK(input.data);
		}
	};
	ZodBoolean.create = (params) => {
		return new ZodBoolean({
			typeName: ZodFirstPartyTypeKind.ZodBoolean,
			coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
			...processCreateParams(params)
		});
	};
	var ZodDate = class ZodDate extends ZodType {
		_parse(input) {
			if (this._def.coerce) input.data = new Date(input.data);
			if (this._getType(input) !== ZodParsedType.date) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.date,
					received: ctx.parsedType
				});
				return INVALID;
			}
			if (isNaN(input.data.getTime())) {
				addIssueToContext(this._getOrReturnCtx(input), { code: ZodIssueCode.invalid_date });
				return INVALID;
			}
			const status = new ParseStatus();
			let ctx = void 0;
			for (const check of this._def.checks) if (check.kind === "min") {
				if (input.data.getTime() < check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_small,
						message: check.message,
						inclusive: true,
						exact: false,
						minimum: check.value,
						type: "date"
					});
					status.dirty();
				}
			} else if (check.kind === "max") {
				if (input.data.getTime() > check.value) {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_big,
						message: check.message,
						inclusive: true,
						exact: false,
						maximum: check.value,
						type: "date"
					});
					status.dirty();
				}
			} else util.assertNever(check);
			return {
				status: status.value,
				value: new Date(input.data.getTime())
			};
		}
		_addCheck(check) {
			return new ZodDate({
				...this._def,
				checks: [...this._def.checks, check]
			});
		}
		min(minDate, message) {
			return this._addCheck({
				kind: "min",
				value: minDate.getTime(),
				message: errorUtil.toString(message)
			});
		}
		max(maxDate, message) {
			return this._addCheck({
				kind: "max",
				value: maxDate.getTime(),
				message: errorUtil.toString(message)
			});
		}
		get minDate() {
			let min = null;
			for (const ch of this._def.checks) if (ch.kind === "min") {
				if (min === null || ch.value > min) min = ch.value;
			}
			return min != null ? new Date(min) : null;
		}
		get maxDate() {
			let max = null;
			for (const ch of this._def.checks) if (ch.kind === "max") {
				if (max === null || ch.value < max) max = ch.value;
			}
			return max != null ? new Date(max) : null;
		}
	};
	ZodDate.create = (params) => {
		return new ZodDate({
			checks: [],
			coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
			typeName: ZodFirstPartyTypeKind.ZodDate,
			...processCreateParams(params)
		});
	};
	var ZodSymbol = class extends ZodType {
		_parse(input) {
			if (this._getType(input) !== ZodParsedType.symbol) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.symbol,
					received: ctx.parsedType
				});
				return INVALID;
			}
			return OK(input.data);
		}
	};
	ZodSymbol.create = (params) => {
		return new ZodSymbol({
			typeName: ZodFirstPartyTypeKind.ZodSymbol,
			...processCreateParams(params)
		});
	};
	var ZodUndefined = class extends ZodType {
		_parse(input) {
			if (this._getType(input) !== ZodParsedType.undefined) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.undefined,
					received: ctx.parsedType
				});
				return INVALID;
			}
			return OK(input.data);
		}
	};
	ZodUndefined.create = (params) => {
		return new ZodUndefined({
			typeName: ZodFirstPartyTypeKind.ZodUndefined,
			...processCreateParams(params)
		});
	};
	var ZodNull = class extends ZodType {
		_parse(input) {
			if (this._getType(input) !== ZodParsedType.null) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.null,
					received: ctx.parsedType
				});
				return INVALID;
			}
			return OK(input.data);
		}
	};
	ZodNull.create = (params) => {
		return new ZodNull({
			typeName: ZodFirstPartyTypeKind.ZodNull,
			...processCreateParams(params)
		});
	};
	var ZodAny = class extends ZodType {
		constructor() {
			super(...arguments);
			this._any = true;
		}
		_parse(input) {
			return OK(input.data);
		}
	};
	ZodAny.create = (params) => {
		return new ZodAny({
			typeName: ZodFirstPartyTypeKind.ZodAny,
			...processCreateParams(params)
		});
	};
	var ZodUnknown = class extends ZodType {
		constructor() {
			super(...arguments);
			this._unknown = true;
		}
		_parse(input) {
			return OK(input.data);
		}
	};
	ZodUnknown.create = (params) => {
		return new ZodUnknown({
			typeName: ZodFirstPartyTypeKind.ZodUnknown,
			...processCreateParams(params)
		});
	};
	var ZodNever = class extends ZodType {
		_parse(input) {
			const ctx = this._getOrReturnCtx(input);
			addIssueToContext(ctx, {
				code: ZodIssueCode.invalid_type,
				expected: ZodParsedType.never,
				received: ctx.parsedType
			});
			return INVALID;
		}
	};
	ZodNever.create = (params) => {
		return new ZodNever({
			typeName: ZodFirstPartyTypeKind.ZodNever,
			...processCreateParams(params)
		});
	};
	var ZodVoid = class extends ZodType {
		_parse(input) {
			if (this._getType(input) !== ZodParsedType.undefined) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.void,
					received: ctx.parsedType
				});
				return INVALID;
			}
			return OK(input.data);
		}
	};
	ZodVoid.create = (params) => {
		return new ZodVoid({
			typeName: ZodFirstPartyTypeKind.ZodVoid,
			...processCreateParams(params)
		});
	};
	var ZodArray = class ZodArray extends ZodType {
		_parse(input) {
			const { ctx, status } = this._processInputParams(input);
			const def = this._def;
			if (ctx.parsedType !== ZodParsedType.array) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.array,
					received: ctx.parsedType
				});
				return INVALID;
			}
			if (def.exactLength !== null) {
				const tooBig = ctx.data.length > def.exactLength.value;
				const tooSmall = ctx.data.length < def.exactLength.value;
				if (tooBig || tooSmall) {
					addIssueToContext(ctx, {
						code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
						minimum: tooSmall ? def.exactLength.value : void 0,
						maximum: tooBig ? def.exactLength.value : void 0,
						type: "array",
						inclusive: true,
						exact: true,
						message: def.exactLength.message
					});
					status.dirty();
				}
			}
			if (def.minLength !== null) {
				if (ctx.data.length < def.minLength.value) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_small,
						minimum: def.minLength.value,
						type: "array",
						inclusive: true,
						exact: false,
						message: def.minLength.message
					});
					status.dirty();
				}
			}
			if (def.maxLength !== null) {
				if (ctx.data.length > def.maxLength.value) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_big,
						maximum: def.maxLength.value,
						type: "array",
						inclusive: true,
						exact: false,
						message: def.maxLength.message
					});
					status.dirty();
				}
			}
			if (ctx.common.async) return Promise.all([...ctx.data].map((item, i) => {
				return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
			})).then((result) => {
				return ParseStatus.mergeArray(status, result);
			});
			const result = [...ctx.data].map((item, i) => {
				return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
			});
			return ParseStatus.mergeArray(status, result);
		}
		get element() {
			return this._def.type;
		}
		min(minLength, message) {
			return new ZodArray({
				...this._def,
				minLength: {
					value: minLength,
					message: errorUtil.toString(message)
				}
			});
		}
		max(maxLength, message) {
			return new ZodArray({
				...this._def,
				maxLength: {
					value: maxLength,
					message: errorUtil.toString(message)
				}
			});
		}
		length(len, message) {
			return new ZodArray({
				...this._def,
				exactLength: {
					value: len,
					message: errorUtil.toString(message)
				}
			});
		}
		nonempty(message) {
			return this.min(1, message);
		}
	};
	ZodArray.create = (schema, params) => {
		return new ZodArray({
			type: schema,
			minLength: null,
			maxLength: null,
			exactLength: null,
			typeName: ZodFirstPartyTypeKind.ZodArray,
			...processCreateParams(params)
		});
	};
	function deepPartialify(schema) {
		if (schema instanceof ZodObject) {
			const newShape = {};
			for (const key in schema.shape) {
				const fieldSchema = schema.shape[key];
				newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
			}
			return new ZodObject({
				...schema._def,
				shape: () => newShape
			});
		} else if (schema instanceof ZodArray) return new ZodArray({
			...schema._def,
			type: deepPartialify(schema.element)
		});
		else if (schema instanceof ZodOptional) return ZodOptional.create(deepPartialify(schema.unwrap()));
		else if (schema instanceof ZodNullable) return ZodNullable.create(deepPartialify(schema.unwrap()));
		else if (schema instanceof ZodTuple) return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
		else return schema;
	}
	var ZodObject = class ZodObject extends ZodType {
		constructor() {
			super(...arguments);
			this._cached = null;
			/**
			* @deprecated In most cases, this is no longer needed - unknown properties are now silently stripped.
			* If you want to pass through unknown properties, use `.passthrough()` instead.
			*/
			this.nonstrict = this.passthrough;
			/**
			* @deprecated Use `.extend` instead
			*  */
			this.augment = this.extend;
		}
		_getCached() {
			if (this._cached !== null) return this._cached;
			const shape = this._def.shape();
			const keys = util.objectKeys(shape);
			return this._cached = {
				shape,
				keys
			};
		}
		_parse(input) {
			if (this._getType(input) !== ZodParsedType.object) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.object,
					received: ctx.parsedType
				});
				return INVALID;
			}
			const { status, ctx } = this._processInputParams(input);
			const { shape, keys: shapeKeys } = this._getCached();
			const extraKeys = [];
			if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
				for (const key in ctx.data) if (!shapeKeys.includes(key)) extraKeys.push(key);
			}
			const pairs = [];
			for (const key of shapeKeys) {
				const keyValidator = shape[key];
				const value = ctx.data[key];
				pairs.push({
					key: {
						status: "valid",
						value: key
					},
					value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
					alwaysSet: key in ctx.data
				});
			}
			if (this._def.catchall instanceof ZodNever) {
				const unknownKeys = this._def.unknownKeys;
				if (unknownKeys === "passthrough") for (const key of extraKeys) pairs.push({
					key: {
						status: "valid",
						value: key
					},
					value: {
						status: "valid",
						value: ctx.data[key]
					}
				});
				else if (unknownKeys === "strict") {
					if (extraKeys.length > 0) {
						addIssueToContext(ctx, {
							code: ZodIssueCode.unrecognized_keys,
							keys: extraKeys
						});
						status.dirty();
					}
				} else if (unknownKeys === "strip");
				else throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
			} else {
				const catchall = this._def.catchall;
				for (const key of extraKeys) {
					const value = ctx.data[key];
					pairs.push({
						key: {
							status: "valid",
							value: key
						},
						value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
						alwaysSet: key in ctx.data
					});
				}
			}
			if (ctx.common.async) return Promise.resolve().then(async () => {
				const syncPairs = [];
				for (const pair of pairs) {
					const key = await pair.key;
					const value = await pair.value;
					syncPairs.push({
						key,
						value,
						alwaysSet: pair.alwaysSet
					});
				}
				return syncPairs;
			}).then((syncPairs) => {
				return ParseStatus.mergeObjectSync(status, syncPairs);
			});
			else return ParseStatus.mergeObjectSync(status, pairs);
		}
		get shape() {
			return this._def.shape();
		}
		strict(message) {
			errorUtil.errToObj;
			return new ZodObject({
				...this._def,
				unknownKeys: "strict",
				...message !== void 0 ? { errorMap: (issue, ctx) => {
					var _a, _b, _c, _d;
					const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
					if (issue.code === "unrecognized_keys") return { message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError };
					return { message: defaultError };
				} } : {}
			});
		}
		strip() {
			return new ZodObject({
				...this._def,
				unknownKeys: "strip"
			});
		}
		passthrough() {
			return new ZodObject({
				...this._def,
				unknownKeys: "passthrough"
			});
		}
		extend(augmentation) {
			return new ZodObject({
				...this._def,
				shape: () => ({
					...this._def.shape(),
					...augmentation
				})
			});
		}
		/**
		* Prior to zod@1.0.12 there was a bug in the
		* inferred type of merged objects. Please
		* upgrade if you are experiencing issues.
		*/
		merge(merging) {
			return new ZodObject({
				unknownKeys: merging._def.unknownKeys,
				catchall: merging._def.catchall,
				shape: () => ({
					...this._def.shape(),
					...merging._def.shape()
				}),
				typeName: ZodFirstPartyTypeKind.ZodObject
			});
		}
		setKey(key, schema) {
			return this.augment({ [key]: schema });
		}
		catchall(index) {
			return new ZodObject({
				...this._def,
				catchall: index
			});
		}
		pick(mask) {
			const shape = {};
			util.objectKeys(mask).forEach((key) => {
				if (mask[key] && this.shape[key]) shape[key] = this.shape[key];
			});
			return new ZodObject({
				...this._def,
				shape: () => shape
			});
		}
		omit(mask) {
			const shape = {};
			util.objectKeys(this.shape).forEach((key) => {
				if (!mask[key]) shape[key] = this.shape[key];
			});
			return new ZodObject({
				...this._def,
				shape: () => shape
			});
		}
		/**
		* @deprecated
		*/
		deepPartial() {
			return deepPartialify(this);
		}
		partial(mask) {
			const newShape = {};
			util.objectKeys(this.shape).forEach((key) => {
				const fieldSchema = this.shape[key];
				if (mask && !mask[key]) newShape[key] = fieldSchema;
				else newShape[key] = fieldSchema.optional();
			});
			return new ZodObject({
				...this._def,
				shape: () => newShape
			});
		}
		required(mask) {
			const newShape = {};
			util.objectKeys(this.shape).forEach((key) => {
				if (mask && !mask[key]) newShape[key] = this.shape[key];
				else {
					let newField = this.shape[key];
					while (newField instanceof ZodOptional) newField = newField._def.innerType;
					newShape[key] = newField;
				}
			});
			return new ZodObject({
				...this._def,
				shape: () => newShape
			});
		}
		keyof() {
			return createZodEnum(util.objectKeys(this.shape));
		}
	};
	ZodObject.create = (shape, params) => {
		return new ZodObject({
			shape: () => shape,
			unknownKeys: "strip",
			catchall: ZodNever.create(),
			typeName: ZodFirstPartyTypeKind.ZodObject,
			...processCreateParams(params)
		});
	};
	ZodObject.strictCreate = (shape, params) => {
		return new ZodObject({
			shape: () => shape,
			unknownKeys: "strict",
			catchall: ZodNever.create(),
			typeName: ZodFirstPartyTypeKind.ZodObject,
			...processCreateParams(params)
		});
	};
	ZodObject.lazycreate = (shape, params) => {
		return new ZodObject({
			shape,
			unknownKeys: "strip",
			catchall: ZodNever.create(),
			typeName: ZodFirstPartyTypeKind.ZodObject,
			...processCreateParams(params)
		});
	};
	var ZodUnion = class extends ZodType {
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			const options = this._def.options;
			function handleResults(results) {
				for (const result of results) if (result.result.status === "valid") return result.result;
				for (const result of results) if (result.result.status === "dirty") {
					ctx.common.issues.push(...result.ctx.common.issues);
					return result.result;
				}
				const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_union,
					unionErrors
				});
				return INVALID;
			}
			if (ctx.common.async) return Promise.all(options.map(async (option) => {
				const childCtx = {
					...ctx,
					common: {
						...ctx.common,
						issues: []
					},
					parent: null
				};
				return {
					result: await option._parseAsync({
						data: ctx.data,
						path: ctx.path,
						parent: childCtx
					}),
					ctx: childCtx
				};
			})).then(handleResults);
			else {
				let dirty = void 0;
				const issues = [];
				for (const option of options) {
					const childCtx = {
						...ctx,
						common: {
							...ctx.common,
							issues: []
						},
						parent: null
					};
					const result = option._parseSync({
						data: ctx.data,
						path: ctx.path,
						parent: childCtx
					});
					if (result.status === "valid") return result;
					else if (result.status === "dirty" && !dirty) dirty = {
						result,
						ctx: childCtx
					};
					if (childCtx.common.issues.length) issues.push(childCtx.common.issues);
				}
				if (dirty) {
					ctx.common.issues.push(...dirty.ctx.common.issues);
					return dirty.result;
				}
				const unionErrors = issues.map((issues) => new ZodError(issues));
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_union,
					unionErrors
				});
				return INVALID;
			}
		}
		get options() {
			return this._def.options;
		}
	};
	ZodUnion.create = (types, params) => {
		return new ZodUnion({
			options: types,
			typeName: ZodFirstPartyTypeKind.ZodUnion,
			...processCreateParams(params)
		});
	};
	const getDiscriminator = (type) => {
		if (type instanceof ZodLazy) return getDiscriminator(type.schema);
		else if (type instanceof ZodEffects) return getDiscriminator(type.innerType());
		else if (type instanceof ZodLiteral) return [type.value];
		else if (type instanceof ZodEnum) return type.options;
		else if (type instanceof ZodNativeEnum) return util.objectValues(type.enum);
		else if (type instanceof ZodDefault) return getDiscriminator(type._def.innerType);
		else if (type instanceof ZodUndefined) return [void 0];
		else if (type instanceof ZodNull) return [null];
		else if (type instanceof ZodOptional) return [void 0, ...getDiscriminator(type.unwrap())];
		else if (type instanceof ZodNullable) return [null, ...getDiscriminator(type.unwrap())];
		else if (type instanceof ZodBranded) return getDiscriminator(type.unwrap());
		else if (type instanceof ZodReadonly) return getDiscriminator(type.unwrap());
		else if (type instanceof ZodCatch) return getDiscriminator(type._def.innerType);
		else return [];
	};
	var ZodDiscriminatedUnion = class ZodDiscriminatedUnion extends ZodType {
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType.object) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.object,
					received: ctx.parsedType
				});
				return INVALID;
			}
			const discriminator = this.discriminator;
			const discriminatorValue = ctx.data[discriminator];
			const option = this.optionsMap.get(discriminatorValue);
			if (!option) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_union_discriminator,
					options: Array.from(this.optionsMap.keys()),
					path: [discriminator]
				});
				return INVALID;
			}
			if (ctx.common.async) return option._parseAsync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			});
			else return option._parseSync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			});
		}
		get discriminator() {
			return this._def.discriminator;
		}
		get options() {
			return this._def.options;
		}
		get optionsMap() {
			return this._def.optionsMap;
		}
		/**
		* The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
		* However, it only allows a union of objects, all of which need to share a discriminator property. This property must
		* have a different value for each object in the union.
		* @param discriminator the name of the discriminator property
		* @param types an array of object schemas
		* @param params
		*/
		static create(discriminator, options, params) {
			const optionsMap = /* @__PURE__ */ new Map();
			for (const type of options) {
				const discriminatorValues = getDiscriminator(type.shape[discriminator]);
				if (!discriminatorValues.length) throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
				for (const value of discriminatorValues) {
					if (optionsMap.has(value)) throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
					optionsMap.set(value, type);
				}
			}
			return new ZodDiscriminatedUnion({
				typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
				discriminator,
				options,
				optionsMap,
				...processCreateParams(params)
			});
		}
	};
	function mergeValues(a, b) {
		const aType = getParsedType(a);
		const bType = getParsedType(b);
		if (a === b) return {
			valid: true,
			data: a
		};
		else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
			const bKeys = util.objectKeys(b);
			const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
			const newObj = {
				...a,
				...b
			};
			for (const key of sharedKeys) {
				const sharedValue = mergeValues(a[key], b[key]);
				if (!sharedValue.valid) return { valid: false };
				newObj[key] = sharedValue.data;
			}
			return {
				valid: true,
				data: newObj
			};
		} else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
			if (a.length !== b.length) return { valid: false };
			const newArray = [];
			for (let index = 0; index < a.length; index++) {
				const itemA = a[index];
				const itemB = b[index];
				const sharedValue = mergeValues(itemA, itemB);
				if (!sharedValue.valid) return { valid: false };
				newArray.push(sharedValue.data);
			}
			return {
				valid: true,
				data: newArray
			};
		} else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) return {
			valid: true,
			data: a
		};
		else return { valid: false };
	}
	var ZodIntersection = class extends ZodType {
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			const handleParsed = (parsedLeft, parsedRight) => {
				if (isAborted(parsedLeft) || isAborted(parsedRight)) return INVALID;
				const merged = mergeValues(parsedLeft.value, parsedRight.value);
				if (!merged.valid) {
					addIssueToContext(ctx, { code: ZodIssueCode.invalid_intersection_types });
					return INVALID;
				}
				if (isDirty(parsedLeft) || isDirty(parsedRight)) status.dirty();
				return {
					status: status.value,
					value: merged.data
				};
			};
			if (ctx.common.async) return Promise.all([this._def.left._parseAsync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			}), this._def.right._parseAsync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			})]).then(([left, right]) => handleParsed(left, right));
			else return handleParsed(this._def.left._parseSync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			}), this._def.right._parseSync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			}));
		}
	};
	ZodIntersection.create = (left, right, params) => {
		return new ZodIntersection({
			left,
			right,
			typeName: ZodFirstPartyTypeKind.ZodIntersection,
			...processCreateParams(params)
		});
	};
	var ZodTuple = class ZodTuple extends ZodType {
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType.array) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.array,
					received: ctx.parsedType
				});
				return INVALID;
			}
			if (ctx.data.length < this._def.items.length) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.too_small,
					minimum: this._def.items.length,
					inclusive: true,
					exact: false,
					type: "array"
				});
				return INVALID;
			}
			if (!this._def.rest && ctx.data.length > this._def.items.length) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.too_big,
					maximum: this._def.items.length,
					inclusive: true,
					exact: false,
					type: "array"
				});
				status.dirty();
			}
			const items = [...ctx.data].map((item, itemIndex) => {
				const schema = this._def.items[itemIndex] || this._def.rest;
				if (!schema) return null;
				return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
			}).filter((x) => !!x);
			if (ctx.common.async) return Promise.all(items).then((results) => {
				return ParseStatus.mergeArray(status, results);
			});
			else return ParseStatus.mergeArray(status, items);
		}
		get items() {
			return this._def.items;
		}
		rest(rest) {
			return new ZodTuple({
				...this._def,
				rest
			});
		}
	};
	ZodTuple.create = (schemas, params) => {
		if (!Array.isArray(schemas)) throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
		return new ZodTuple({
			items: schemas,
			typeName: ZodFirstPartyTypeKind.ZodTuple,
			rest: null,
			...processCreateParams(params)
		});
	};
	var ZodRecord = class ZodRecord extends ZodType {
		get keySchema() {
			return this._def.keyType;
		}
		get valueSchema() {
			return this._def.valueType;
		}
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType.object) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.object,
					received: ctx.parsedType
				});
				return INVALID;
			}
			const pairs = [];
			const keyType = this._def.keyType;
			const valueType = this._def.valueType;
			for (const key in ctx.data) pairs.push({
				key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
				value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
				alwaysSet: key in ctx.data
			});
			if (ctx.common.async) return ParseStatus.mergeObjectAsync(status, pairs);
			else return ParseStatus.mergeObjectSync(status, pairs);
		}
		get element() {
			return this._def.valueType;
		}
		static create(first, second, third) {
			if (second instanceof ZodType) return new ZodRecord({
				keyType: first,
				valueType: second,
				typeName: ZodFirstPartyTypeKind.ZodRecord,
				...processCreateParams(third)
			});
			return new ZodRecord({
				keyType: ZodString.create(),
				valueType: first,
				typeName: ZodFirstPartyTypeKind.ZodRecord,
				...processCreateParams(second)
			});
		}
	};
	var ZodMap = class extends ZodType {
		get keySchema() {
			return this._def.keyType;
		}
		get valueSchema() {
			return this._def.valueType;
		}
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType.map) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.map,
					received: ctx.parsedType
				});
				return INVALID;
			}
			const keyType = this._def.keyType;
			const valueType = this._def.valueType;
			const pairs = [...ctx.data.entries()].map(([key, value], index) => {
				return {
					key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
					value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
				};
			});
			if (ctx.common.async) {
				const finalMap = /* @__PURE__ */ new Map();
				return Promise.resolve().then(async () => {
					for (const pair of pairs) {
						const key = await pair.key;
						const value = await pair.value;
						if (key.status === "aborted" || value.status === "aborted") return INVALID;
						if (key.status === "dirty" || value.status === "dirty") status.dirty();
						finalMap.set(key.value, value.value);
					}
					return {
						status: status.value,
						value: finalMap
					};
				});
			} else {
				const finalMap = /* @__PURE__ */ new Map();
				for (const pair of pairs) {
					const key = pair.key;
					const value = pair.value;
					if (key.status === "aborted" || value.status === "aborted") return INVALID;
					if (key.status === "dirty" || value.status === "dirty") status.dirty();
					finalMap.set(key.value, value.value);
				}
				return {
					status: status.value,
					value: finalMap
				};
			}
		}
	};
	ZodMap.create = (keyType, valueType, params) => {
		return new ZodMap({
			valueType,
			keyType,
			typeName: ZodFirstPartyTypeKind.ZodMap,
			...processCreateParams(params)
		});
	};
	var ZodSet = class ZodSet extends ZodType {
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType.set) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.set,
					received: ctx.parsedType
				});
				return INVALID;
			}
			const def = this._def;
			if (def.minSize !== null) {
				if (ctx.data.size < def.minSize.value) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_small,
						minimum: def.minSize.value,
						type: "set",
						inclusive: true,
						exact: false,
						message: def.minSize.message
					});
					status.dirty();
				}
			}
			if (def.maxSize !== null) {
				if (ctx.data.size > def.maxSize.value) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_big,
						maximum: def.maxSize.value,
						type: "set",
						inclusive: true,
						exact: false,
						message: def.maxSize.message
					});
					status.dirty();
				}
			}
			const valueType = this._def.valueType;
			function finalizeSet(elements) {
				const parsedSet = /* @__PURE__ */ new Set();
				for (const element of elements) {
					if (element.status === "aborted") return INVALID;
					if (element.status === "dirty") status.dirty();
					parsedSet.add(element.value);
				}
				return {
					status: status.value,
					value: parsedSet
				};
			}
			const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
			if (ctx.common.async) return Promise.all(elements).then((elements) => finalizeSet(elements));
			else return finalizeSet(elements);
		}
		min(minSize, message) {
			return new ZodSet({
				...this._def,
				minSize: {
					value: minSize,
					message: errorUtil.toString(message)
				}
			});
		}
		max(maxSize, message) {
			return new ZodSet({
				...this._def,
				maxSize: {
					value: maxSize,
					message: errorUtil.toString(message)
				}
			});
		}
		size(size, message) {
			return this.min(size, message).max(size, message);
		}
		nonempty(message) {
			return this.min(1, message);
		}
	};
	ZodSet.create = (valueType, params) => {
		return new ZodSet({
			valueType,
			minSize: null,
			maxSize: null,
			typeName: ZodFirstPartyTypeKind.ZodSet,
			...processCreateParams(params)
		});
	};
	var ZodFunction = class ZodFunction extends ZodType {
		constructor() {
			super(...arguments);
			this.validate = this.implement;
		}
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType.function) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.function,
					received: ctx.parsedType
				});
				return INVALID;
			}
			function makeArgsIssue(args, error) {
				return makeIssue({
					data: args,
					path: ctx.path,
					errorMaps: [
						ctx.common.contextualErrorMap,
						ctx.schemaErrorMap,
						getErrorMap(),
						errorMap
					].filter((x) => !!x),
					issueData: {
						code: ZodIssueCode.invalid_arguments,
						argumentsError: error
					}
				});
			}
			function makeReturnsIssue(returns, error) {
				return makeIssue({
					data: returns,
					path: ctx.path,
					errorMaps: [
						ctx.common.contextualErrorMap,
						ctx.schemaErrorMap,
						getErrorMap(),
						errorMap
					].filter((x) => !!x),
					issueData: {
						code: ZodIssueCode.invalid_return_type,
						returnTypeError: error
					}
				});
			}
			const params = { errorMap: ctx.common.contextualErrorMap };
			const fn = ctx.data;
			if (this._def.returns instanceof ZodPromise) {
				const me = this;
				return OK(async function(...args) {
					const error = new ZodError([]);
					const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
						error.addIssue(makeArgsIssue(args, e));
						throw error;
					});
					const result = await Reflect.apply(fn, this, parsedArgs);
					return await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
						error.addIssue(makeReturnsIssue(result, e));
						throw error;
					});
				});
			} else {
				const me = this;
				return OK(function(...args) {
					const parsedArgs = me._def.args.safeParse(args, params);
					if (!parsedArgs.success) throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
					const result = Reflect.apply(fn, this, parsedArgs.data);
					const parsedReturns = me._def.returns.safeParse(result, params);
					if (!parsedReturns.success) throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
					return parsedReturns.data;
				});
			}
		}
		parameters() {
			return this._def.args;
		}
		returnType() {
			return this._def.returns;
		}
		args(...items) {
			return new ZodFunction({
				...this._def,
				args: ZodTuple.create(items).rest(ZodUnknown.create())
			});
		}
		returns(returnType) {
			return new ZodFunction({
				...this._def,
				returns: returnType
			});
		}
		implement(func) {
			return this.parse(func);
		}
		strictImplement(func) {
			return this.parse(func);
		}
		static create(args, returns, params) {
			return new ZodFunction({
				args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
				returns: returns || ZodUnknown.create(),
				typeName: ZodFirstPartyTypeKind.ZodFunction,
				...processCreateParams(params)
			});
		}
	};
	var ZodLazy = class extends ZodType {
		get schema() {
			return this._def.getter();
		}
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			return this._def.getter()._parse({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			});
		}
	};
	ZodLazy.create = (getter, params) => {
		return new ZodLazy({
			getter,
			typeName: ZodFirstPartyTypeKind.ZodLazy,
			...processCreateParams(params)
		});
	};
	var ZodLiteral = class extends ZodType {
		_parse(input) {
			if (input.data !== this._def.value) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					received: ctx.data,
					code: ZodIssueCode.invalid_literal,
					expected: this._def.value
				});
				return INVALID;
			}
			return {
				status: "valid",
				value: input.data
			};
		}
		get value() {
			return this._def.value;
		}
	};
	ZodLiteral.create = (value, params) => {
		return new ZodLiteral({
			value,
			typeName: ZodFirstPartyTypeKind.ZodLiteral,
			...processCreateParams(params)
		});
	};
	function createZodEnum(values, params) {
		return new ZodEnum({
			values,
			typeName: ZodFirstPartyTypeKind.ZodEnum,
			...processCreateParams(params)
		});
	}
	var ZodEnum = class ZodEnum extends ZodType {
		constructor() {
			super(...arguments);
			_ZodEnum_cache.set(this, void 0);
		}
		_parse(input) {
			if (typeof input.data !== "string") {
				const ctx = this._getOrReturnCtx(input);
				const expectedValues = this._def.values;
				addIssueToContext(ctx, {
					expected: util.joinValues(expectedValues),
					received: ctx.parsedType,
					code: ZodIssueCode.invalid_type
				});
				return INVALID;
			}
			if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
			if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
				const ctx = this._getOrReturnCtx(input);
				const expectedValues = this._def.values;
				addIssueToContext(ctx, {
					received: ctx.data,
					code: ZodIssueCode.invalid_enum_value,
					options: expectedValues
				});
				return INVALID;
			}
			return OK(input.data);
		}
		get options() {
			return this._def.values;
		}
		get enum() {
			const enumValues = {};
			for (const val of this._def.values) enumValues[val] = val;
			return enumValues;
		}
		get Values() {
			const enumValues = {};
			for (const val of this._def.values) enumValues[val] = val;
			return enumValues;
		}
		get Enum() {
			const enumValues = {};
			for (const val of this._def.values) enumValues[val] = val;
			return enumValues;
		}
		extract(values, newDef = this._def) {
			return ZodEnum.create(values, {
				...this._def,
				...newDef
			});
		}
		exclude(values, newDef = this._def) {
			return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
				...this._def,
				...newDef
			});
		}
	};
	_ZodEnum_cache = /* @__PURE__ */ new WeakMap();
	ZodEnum.create = createZodEnum;
	var ZodNativeEnum = class extends ZodType {
		constructor() {
			super(...arguments);
			_ZodNativeEnum_cache.set(this, void 0);
		}
		_parse(input) {
			const nativeEnumValues = util.getValidEnumValues(this._def.values);
			const ctx = this._getOrReturnCtx(input);
			if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
				const expectedValues = util.objectValues(nativeEnumValues);
				addIssueToContext(ctx, {
					expected: util.joinValues(expectedValues),
					received: ctx.parsedType,
					code: ZodIssueCode.invalid_type
				});
				return INVALID;
			}
			if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
			if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
				const expectedValues = util.objectValues(nativeEnumValues);
				addIssueToContext(ctx, {
					received: ctx.data,
					code: ZodIssueCode.invalid_enum_value,
					options: expectedValues
				});
				return INVALID;
			}
			return OK(input.data);
		}
		get enum() {
			return this._def.values;
		}
	};
	_ZodNativeEnum_cache = /* @__PURE__ */ new WeakMap();
	ZodNativeEnum.create = (values, params) => {
		return new ZodNativeEnum({
			values,
			typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
			...processCreateParams(params)
		});
	};
	var ZodPromise = class extends ZodType {
		unwrap() {
			return this._def.type;
		}
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.promise,
					received: ctx.parsedType
				});
				return INVALID;
			}
			return OK((ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data)).then((data) => {
				return this._def.type.parseAsync(data, {
					path: ctx.path,
					errorMap: ctx.common.contextualErrorMap
				});
			}));
		}
	};
	ZodPromise.create = (schema, params) => {
		return new ZodPromise({
			type: schema,
			typeName: ZodFirstPartyTypeKind.ZodPromise,
			...processCreateParams(params)
		});
	};
	var ZodEffects = class extends ZodType {
		innerType() {
			return this._def.schema;
		}
		sourceType() {
			return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
		}
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			const effect = this._def.effect || null;
			const checkCtx = {
				addIssue: (arg) => {
					addIssueToContext(ctx, arg);
					if (arg.fatal) status.abort();
					else status.dirty();
				},
				get path() {
					return ctx.path;
				}
			};
			checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
			if (effect.type === "preprocess") {
				const processed = effect.transform(ctx.data, checkCtx);
				if (ctx.common.async) return Promise.resolve(processed).then(async (processed) => {
					if (status.value === "aborted") return INVALID;
					const result = await this._def.schema._parseAsync({
						data: processed,
						path: ctx.path,
						parent: ctx
					});
					if (result.status === "aborted") return INVALID;
					if (result.status === "dirty") return DIRTY(result.value);
					if (status.value === "dirty") return DIRTY(result.value);
					return result;
				});
				else {
					if (status.value === "aborted") return INVALID;
					const result = this._def.schema._parseSync({
						data: processed,
						path: ctx.path,
						parent: ctx
					});
					if (result.status === "aborted") return INVALID;
					if (result.status === "dirty") return DIRTY(result.value);
					if (status.value === "dirty") return DIRTY(result.value);
					return result;
				}
			}
			if (effect.type === "refinement") {
				const executeRefinement = (acc) => {
					const result = effect.refinement(acc, checkCtx);
					if (ctx.common.async) return Promise.resolve(result);
					if (result instanceof Promise) throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
					return acc;
				};
				if (ctx.common.async === false) {
					const inner = this._def.schema._parseSync({
						data: ctx.data,
						path: ctx.path,
						parent: ctx
					});
					if (inner.status === "aborted") return INVALID;
					if (inner.status === "dirty") status.dirty();
					executeRefinement(inner.value);
					return {
						status: status.value,
						value: inner.value
					};
				} else return this._def.schema._parseAsync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				}).then((inner) => {
					if (inner.status === "aborted") return INVALID;
					if (inner.status === "dirty") status.dirty();
					return executeRefinement(inner.value).then(() => {
						return {
							status: status.value,
							value: inner.value
						};
					});
				});
			}
			if (effect.type === "transform") if (ctx.common.async === false) {
				const base = this._def.schema._parseSync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				});
				if (!isValid(base)) return base;
				const result = effect.transform(base.value, checkCtx);
				if (result instanceof Promise) throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
				return {
					status: status.value,
					value: result
				};
			} else return this._def.schema._parseAsync({
				data: ctx.data,
				path: ctx.path,
				parent: ctx
			}).then((base) => {
				if (!isValid(base)) return base;
				return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
					status: status.value,
					value: result
				}));
			});
			util.assertNever(effect);
		}
	};
	ZodEffects.create = (schema, effect, params) => {
		return new ZodEffects({
			schema,
			typeName: ZodFirstPartyTypeKind.ZodEffects,
			effect,
			...processCreateParams(params)
		});
	};
	ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
		return new ZodEffects({
			schema,
			effect: {
				type: "preprocess",
				transform: preprocess
			},
			typeName: ZodFirstPartyTypeKind.ZodEffects,
			...processCreateParams(params)
		});
	};
	var ZodOptional = class extends ZodType {
		_parse(input) {
			if (this._getType(input) === ZodParsedType.undefined) return OK(void 0);
			return this._def.innerType._parse(input);
		}
		unwrap() {
			return this._def.innerType;
		}
	};
	ZodOptional.create = (type, params) => {
		return new ZodOptional({
			innerType: type,
			typeName: ZodFirstPartyTypeKind.ZodOptional,
			...processCreateParams(params)
		});
	};
	var ZodNullable = class extends ZodType {
		_parse(input) {
			if (this._getType(input) === ZodParsedType.null) return OK(null);
			return this._def.innerType._parse(input);
		}
		unwrap() {
			return this._def.innerType;
		}
	};
	ZodNullable.create = (type, params) => {
		return new ZodNullable({
			innerType: type,
			typeName: ZodFirstPartyTypeKind.ZodNullable,
			...processCreateParams(params)
		});
	};
	var ZodDefault = class extends ZodType {
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			let data = ctx.data;
			if (ctx.parsedType === ZodParsedType.undefined) data = this._def.defaultValue();
			return this._def.innerType._parse({
				data,
				path: ctx.path,
				parent: ctx
			});
		}
		removeDefault() {
			return this._def.innerType;
		}
	};
	ZodDefault.create = (type, params) => {
		return new ZodDefault({
			innerType: type,
			typeName: ZodFirstPartyTypeKind.ZodDefault,
			defaultValue: typeof params.default === "function" ? params.default : () => params.default,
			...processCreateParams(params)
		});
	};
	var ZodCatch = class extends ZodType {
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			const newCtx = {
				...ctx,
				common: {
					...ctx.common,
					issues: []
				}
			};
			const result = this._def.innerType._parse({
				data: newCtx.data,
				path: newCtx.path,
				parent: { ...newCtx }
			});
			if (isAsync(result)) return result.then((result) => {
				return {
					status: "valid",
					value: result.status === "valid" ? result.value : this._def.catchValue({
						get error() {
							return new ZodError(newCtx.common.issues);
						},
						input: newCtx.data
					})
				};
			});
			else return {
				status: "valid",
				value: result.status === "valid" ? result.value : this._def.catchValue({
					get error() {
						return new ZodError(newCtx.common.issues);
					},
					input: newCtx.data
				})
			};
		}
		removeCatch() {
			return this._def.innerType;
		}
	};
	ZodCatch.create = (type, params) => {
		return new ZodCatch({
			innerType: type,
			typeName: ZodFirstPartyTypeKind.ZodCatch,
			catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
			...processCreateParams(params)
		});
	};
	var ZodNaN = class extends ZodType {
		_parse(input) {
			if (this._getType(input) !== ZodParsedType.nan) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.nan,
					received: ctx.parsedType
				});
				return INVALID;
			}
			return {
				status: "valid",
				value: input.data
			};
		}
	};
	ZodNaN.create = (params) => {
		return new ZodNaN({
			typeName: ZodFirstPartyTypeKind.ZodNaN,
			...processCreateParams(params)
		});
	};
	const BRAND = Symbol("zod_brand");
	var ZodBranded = class extends ZodType {
		_parse(input) {
			const { ctx } = this._processInputParams(input);
			const data = ctx.data;
			return this._def.type._parse({
				data,
				path: ctx.path,
				parent: ctx
			});
		}
		unwrap() {
			return this._def.type;
		}
	};
	var ZodPipeline = class ZodPipeline extends ZodType {
		_parse(input) {
			const { status, ctx } = this._processInputParams(input);
			if (ctx.common.async) {
				const handleAsync = async () => {
					const inResult = await this._def.in._parseAsync({
						data: ctx.data,
						path: ctx.path,
						parent: ctx
					});
					if (inResult.status === "aborted") return INVALID;
					if (inResult.status === "dirty") {
						status.dirty();
						return DIRTY(inResult.value);
					} else return this._def.out._parseAsync({
						data: inResult.value,
						path: ctx.path,
						parent: ctx
					});
				};
				return handleAsync();
			} else {
				const inResult = this._def.in._parseSync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				});
				if (inResult.status === "aborted") return INVALID;
				if (inResult.status === "dirty") {
					status.dirty();
					return {
						status: "dirty",
						value: inResult.value
					};
				} else return this._def.out._parseSync({
					data: inResult.value,
					path: ctx.path,
					parent: ctx
				});
			}
		}
		static create(a, b) {
			return new ZodPipeline({
				in: a,
				out: b,
				typeName: ZodFirstPartyTypeKind.ZodPipeline
			});
		}
	};
	var ZodReadonly = class extends ZodType {
		_parse(input) {
			const result = this._def.innerType._parse(input);
			const freeze = (data) => {
				if (isValid(data)) data.value = Object.freeze(data.value);
				return data;
			};
			return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
		}
		unwrap() {
			return this._def.innerType;
		}
	};
	ZodReadonly.create = (type, params) => {
		return new ZodReadonly({
			innerType: type,
			typeName: ZodFirstPartyTypeKind.ZodReadonly,
			...processCreateParams(params)
		});
	};
	function custom(check, params = {}, fatal) {
		if (check) return ZodAny.create().superRefine((data, ctx) => {
			var _a, _b;
			if (!check(data)) {
				const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
				const _fatal = (_b = (_a = p.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
				const p2 = typeof p === "string" ? { message: p } : p;
				ctx.addIssue({
					code: "custom",
					...p2,
					fatal: _fatal
				});
			}
		});
		return ZodAny.create();
	}
	const late = { object: ZodObject.lazycreate };
	var ZodFirstPartyTypeKind;
	(function(ZodFirstPartyTypeKind) {
		ZodFirstPartyTypeKind["ZodString"] = "ZodString";
		ZodFirstPartyTypeKind["ZodNumber"] = "ZodNumber";
		ZodFirstPartyTypeKind["ZodNaN"] = "ZodNaN";
		ZodFirstPartyTypeKind["ZodBigInt"] = "ZodBigInt";
		ZodFirstPartyTypeKind["ZodBoolean"] = "ZodBoolean";
		ZodFirstPartyTypeKind["ZodDate"] = "ZodDate";
		ZodFirstPartyTypeKind["ZodSymbol"] = "ZodSymbol";
		ZodFirstPartyTypeKind["ZodUndefined"] = "ZodUndefined";
		ZodFirstPartyTypeKind["ZodNull"] = "ZodNull";
		ZodFirstPartyTypeKind["ZodAny"] = "ZodAny";
		ZodFirstPartyTypeKind["ZodUnknown"] = "ZodUnknown";
		ZodFirstPartyTypeKind["ZodNever"] = "ZodNever";
		ZodFirstPartyTypeKind["ZodVoid"] = "ZodVoid";
		ZodFirstPartyTypeKind["ZodArray"] = "ZodArray";
		ZodFirstPartyTypeKind["ZodObject"] = "ZodObject";
		ZodFirstPartyTypeKind["ZodUnion"] = "ZodUnion";
		ZodFirstPartyTypeKind["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
		ZodFirstPartyTypeKind["ZodIntersection"] = "ZodIntersection";
		ZodFirstPartyTypeKind["ZodTuple"] = "ZodTuple";
		ZodFirstPartyTypeKind["ZodRecord"] = "ZodRecord";
		ZodFirstPartyTypeKind["ZodMap"] = "ZodMap";
		ZodFirstPartyTypeKind["ZodSet"] = "ZodSet";
		ZodFirstPartyTypeKind["ZodFunction"] = "ZodFunction";
		ZodFirstPartyTypeKind["ZodLazy"] = "ZodLazy";
		ZodFirstPartyTypeKind["ZodLiteral"] = "ZodLiteral";
		ZodFirstPartyTypeKind["ZodEnum"] = "ZodEnum";
		ZodFirstPartyTypeKind["ZodEffects"] = "ZodEffects";
		ZodFirstPartyTypeKind["ZodNativeEnum"] = "ZodNativeEnum";
		ZodFirstPartyTypeKind["ZodOptional"] = "ZodOptional";
		ZodFirstPartyTypeKind["ZodNullable"] = "ZodNullable";
		ZodFirstPartyTypeKind["ZodDefault"] = "ZodDefault";
		ZodFirstPartyTypeKind["ZodCatch"] = "ZodCatch";
		ZodFirstPartyTypeKind["ZodPromise"] = "ZodPromise";
		ZodFirstPartyTypeKind["ZodBranded"] = "ZodBranded";
		ZodFirstPartyTypeKind["ZodPipeline"] = "ZodPipeline";
		ZodFirstPartyTypeKind["ZodReadonly"] = "ZodReadonly";
	})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
	const instanceOfType = (cls, params = { message: `Input not instance of ${cls.name}` }) => custom((data) => data instanceof cls, params);
	const stringType = ZodString.create;
	const numberType = ZodNumber.create;
	const nanType = ZodNaN.create;
	const bigIntType = ZodBigInt.create;
	const booleanType = ZodBoolean.create;
	const dateType = ZodDate.create;
	const symbolType = ZodSymbol.create;
	const undefinedType = ZodUndefined.create;
	const nullType = ZodNull.create;
	const anyType = ZodAny.create;
	const unknownType = ZodUnknown.create;
	const neverType = ZodNever.create;
	const voidType = ZodVoid.create;
	const arrayType = ZodArray.create;
	const objectType = ZodObject.create;
	const strictObjectType = ZodObject.strictCreate;
	const unionType = ZodUnion.create;
	const discriminatedUnionType = ZodDiscriminatedUnion.create;
	const intersectionType = ZodIntersection.create;
	const tupleType = ZodTuple.create;
	const recordType = ZodRecord.create;
	const mapType = ZodMap.create;
	const setType = ZodSet.create;
	const functionType = ZodFunction.create;
	const lazyType = ZodLazy.create;
	const literalType = ZodLiteral.create;
	const enumType = ZodEnum.create;
	const nativeEnumType = ZodNativeEnum.create;
	const promiseType = ZodPromise.create;
	const effectsType = ZodEffects.create;
	const optionalType = ZodOptional.create;
	const nullableType = ZodNullable.create;
	const preprocessType = ZodEffects.createWithPreprocess;
	const pipelineType = ZodPipeline.create;
	const ostring = () => stringType().optional();
	const onumber = () => numberType().optional();
	const oboolean = () => booleanType().optional();
	var z = /* @__PURE__ */ Object.freeze({
		__proto__: null,
		defaultErrorMap: errorMap,
		setErrorMap,
		getErrorMap,
		makeIssue,
		EMPTY_PATH,
		addIssueToContext,
		ParseStatus,
		INVALID,
		DIRTY,
		OK,
		isAborted,
		isDirty,
		isValid,
		isAsync,
		get util() {
			return util;
		},
		get objectUtil() {
			return objectUtil;
		},
		ZodParsedType,
		getParsedType,
		ZodType,
		datetimeRegex,
		ZodString,
		ZodNumber,
		ZodBigInt,
		ZodBoolean,
		ZodDate,
		ZodSymbol,
		ZodUndefined,
		ZodNull,
		ZodAny,
		ZodUnknown,
		ZodNever,
		ZodVoid,
		ZodArray,
		ZodObject,
		ZodUnion,
		ZodDiscriminatedUnion,
		ZodIntersection,
		ZodTuple,
		ZodRecord,
		ZodMap,
		ZodSet,
		ZodFunction,
		ZodLazy,
		ZodLiteral,
		ZodEnum,
		ZodNativeEnum,
		ZodPromise,
		ZodEffects,
		ZodTransformer: ZodEffects,
		ZodOptional,
		ZodNullable,
		ZodDefault,
		ZodCatch,
		ZodNaN,
		BRAND,
		ZodBranded,
		ZodPipeline,
		ZodReadonly,
		custom,
		Schema: ZodType,
		ZodSchema: ZodType,
		late,
		get ZodFirstPartyTypeKind() {
			return ZodFirstPartyTypeKind;
		},
		coerce: {
			string: ((arg) => ZodString.create({
				...arg,
				coerce: true
			})),
			number: ((arg) => ZodNumber.create({
				...arg,
				coerce: true
			})),
			boolean: ((arg) => ZodBoolean.create({
				...arg,
				coerce: true
			})),
			bigint: ((arg) => ZodBigInt.create({
				...arg,
				coerce: true
			})),
			date: ((arg) => ZodDate.create({
				...arg,
				coerce: true
			}))
		},
		any: anyType,
		array: arrayType,
		bigint: bigIntType,
		boolean: booleanType,
		date: dateType,
		discriminatedUnion: discriminatedUnionType,
		effect: effectsType,
		"enum": enumType,
		"function": functionType,
		"instanceof": instanceOfType,
		intersection: intersectionType,
		lazy: lazyType,
		literal: literalType,
		map: mapType,
		nan: nanType,
		nativeEnum: nativeEnumType,
		never: neverType,
		"null": nullType,
		nullable: nullableType,
		number: numberType,
		object: objectType,
		oboolean,
		onumber,
		optional: optionalType,
		ostring,
		pipeline: pipelineType,
		preprocess: preprocessType,
		promise: promiseType,
		record: recordType,
		set: setType,
		strictObject: strictObjectType,
		string: stringType,
		symbol: symbolType,
		transformer: effectsType,
		tuple: tupleType,
		"undefined": undefinedType,
		union: unionType,
		unknown: unknownType,
		"void": voidType,
		NEVER: INVALID,
		ZodIssueCode,
		quotelessJson,
		ZodError
	});
	const PlErrorLike = z.object({
		type: z.literal("PlError"),
		name: z.string(),
		message: z.string(),
		fullMessage: z.string().optional(),
		stack: z.string().optional()
	}).extend({
		cause: z.lazy(() => ErrorLike).optional(),
		errors: z.lazy(() => ErrorLike.array()).optional()
	});
	const StandardErrorLike = z.object({
		type: z.literal("StandardError"),
		name: z.string(),
		message: z.string(),
		stack: z.string().optional()
	}).extend({
		cause: z.lazy(() => ErrorLike).optional(),
		errors: z.lazy(() => ErrorLike.array()).optional()
	});
	const ErrorLike = z.union([StandardErrorLike, PlErrorLike]);
	const ErrorShape = z.object({
		name: z.string(),
		message: z.string(),
		fullMessage: z.string().optional(),
		stack: z.string().optional()
	}).extend({
		cause: z.lazy(() => ErrorShape).optional(),
		errors: z.lazy(() => ErrorShape.array()).optional()
	});
	//#endregion
	//#region src/index.ts
	const dataModel = new DataModelBuilder().from("v1").init(() => ({
		seqCol: "",
		countCol: "",
		fullLengthCol: "",
		cdr1Col: "",
		cdr2Col: "",
		fr1Col: "",
		fr2Col: "",
		fr3Col: "",
		fr4Col: "",
		cdr3MinLength: 0,
		cdr3MaxLength: 1e4,
		filterCdr3Length: false,
		fullLengthMinLength: 0,
		fullLengthMaxLength: 1e4,
		cdr1MinLength: 0,
		cdr1MaxLength: 1e4,
		cdr2MinLength: 0,
		cdr2MaxLength: 1e4,
		fr1MinLength: 0,
		fr1MaxLength: 1e4,
		fr2MinLength: 0,
		fr2MaxLength: 1e4,
		fr3MinLength: 0,
		fr3MaxLength: 1e4,
		fr4MinLength: 0,
		fr4MaxLength: 1e4,
		filterFullLength: false,
		filterCdr1Length: false,
		filterCdr2Length: false,
		filterFr1Length: false,
		filterFr2Length: false,
		filterFr3Length: false,
		filterFr4Length: false,
		filtercdr1: false,
		filtercdr2: false,
		filterfr1: false,
		filterfr2: false,
		filterfr3: false,
		filterfr4: false,
		maxHd: 2,
		minRatio: 100,
		lowerCutoff: 5
	}));
	//#endregion
	exports.platforma = BlockModelV3.create(dataModel).args((data) => ({
		inputRef: data.inputRef,
		seqCol: data.seqCol,
		countCol: data.countCol,
		fullLengthCol: data.fullLengthCol,
		cdr1Col: data.cdr1Col,
		cdr2Col: data.cdr2Col,
		fr1Col: data.fr1Col,
		fr2Col: data.fr2Col,
		fr3Col: data.fr3Col,
		fr4Col: data.fr4Col,
		cdr3MinLength: data.cdr3MinLength,
		cdr3MaxLength: data.cdr3MaxLength,
		filterCdr3Length: data.filterCdr3Length,
		fullLengthMinLength: data.fullLengthMinLength,
		fullLengthMaxLength: data.fullLengthMaxLength,
		filterFullLength: data.filterFullLength,
		cdr1MinLength: data.cdr1MinLength,
		cdr1MaxLength: data.cdr1MaxLength,
		cdr2MinLength: data.cdr2MinLength,
		cdr2MaxLength: data.cdr2MaxLength,
		fr1MinLength: data.fr1MinLength,
		fr1MaxLength: data.fr1MaxLength,
		fr2MinLength: data.fr2MinLength,
		fr2MaxLength: data.fr2MaxLength,
		fr3MinLength: data.fr3MinLength,
		fr3MaxLength: data.fr3MaxLength,
		fr4MinLength: data.fr4MinLength,
		fr4MaxLength: data.fr4MaxLength,
		filterCdr1Length: data.filterCdr1Length,
		filterCdr2Length: data.filterCdr2Length,
		filterFr1Length: data.filterFr1Length,
		filterFr2Length: data.filterFr2Length,
		filterFr3Length: data.filterFr3Length,
		filterFr4Length: data.filterFr4Length,
		maxHd: data.maxHd,
		minRatio: data.minRatio,
		lowerCutoff: data.lowerCutoff
	})).output("inputOptions", (ctx) => ctx.resultPool.getOptions([{
		axes: [{ name: "pl7.app/sampleId" }, { name: "pl7.app/vdj/clonotypeKey" }],
		annotations: { "pl7.app/isAnchor": "true" }
	}], { label: {
		includeNativeLabel: false,
		forceTraceElements: ["milaboratories.samples-and-data/dataset"]
	} }) ?? []).output("isRunning", (ctx) => ctx.outputs?.getIsReadyOrError() === false).output("sequenceColumnOptions", (ctx) => {
		const inputRef = ctx.args?.inputRef;
		if (inputRef === void 0) return [];
		return (ctx.resultPool.getAnchoredPColumns({ main: inputRef }, {
			axes: [{
				anchor: "main",
				idx: 1
			}],
			name: "pl7.app/vdj/sequence"
		}) ?? []).map((col) => {
			const label = col.spec.annotations?.["pl7.app/label"] ?? col.spec.name;
			return {
				value: label,
				label
			};
		});
	}).output("countColumnOptions", (ctx) => {
		const inputRef = ctx.args?.inputRef;
		if (inputRef === void 0) return [];
		return (ctx.resultPool.getAnchoredPColumns({ main: inputRef }, {
			axes: [{
				anchor: "main",
				idx: 0
			}, {
				anchor: "main",
				idx: 1
			}],
			annotations: {
				"pl7.app/isAbundance": "true",
				"pl7.app/abundance/normalized": "false"
			}
		}) ?? []).map((col) => {
			const label = col.spec.annotations?.["pl7.app/label"] ?? col.spec.name;
			return {
				value: label,
				label
			};
		});
	}).output("pythonMessage", (ctx) => ctx.outputs?.resolve("pythonMessage")?.getDataAsString()).output("hasResult", (ctx) => ctx.outputs?.resolve({
		field: "pf",
		assertFieldType: "Input",
		allowPermanentAbsence: true
	}) !== void 0).sections((_ctx) => [{
		type: "link",
		href: "/",
		label: "Main"
	}]).title(() => "Custom Error Correction").done();
});

//# sourceMappingURL=bundle.js.map