import { BlockModelV3, DataModelBuilder } from "@platforma-sdk/model";
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
const platforma = BlockModelV3.create(dataModel).args((data) => ({
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
//#endregion
export { platforma };

//# sourceMappingURL=index.js.map