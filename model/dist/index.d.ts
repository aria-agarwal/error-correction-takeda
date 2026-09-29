import * as _$_platforma_sdk_model0 from "@platforma-sdk/model";
import { InferOutputsType, PlRef } from "@platforma-sdk/model";

//#region src/index.d.ts
type BlockData = {
  inputRef?: PlRef;
  seqCol: string;
  countCol: string;
  fullLengthCol: string;
  cdr1Col: string;
  cdr2Col: string;
  fr1Col: string;
  fr2Col: string;
  fr3Col: string;
  fr4Col: string;
  cdr3MinLength: number;
  cdr3MaxLength: number;
  filterCdr3Length: boolean;
  fullLengthMinLength: number;
  fullLengthMaxLength: number;
  cdr1MinLength: number;
  cdr1MaxLength: number;
  cdr2MinLength: number;
  cdr2MaxLength: number;
  fr1MinLength: number;
  fr1MaxLength: number;
  fr2MinLength: number;
  fr2MaxLength: number;
  fr3MinLength: number;
  fr3MaxLength: number;
  fr4MinLength: number;
  fr4MaxLength: number;
  filterFullLength: boolean;
  filterCdr1Length: boolean;
  filterCdr2Length: boolean;
  filterFr1Length: boolean;
  filterFr2Length: boolean;
  filterFr3Length: boolean;
  filterFr4Length: boolean;
  maxHd: number;
  minRatio: number;
  lowerCutoff: number;
};
declare const platforma: _$_platforma_sdk_model0.PlatformaExtended<_$_platforma_sdk_model0.PlatformaV3<BlockData, {
  inputRef: Readonly<{
    __isRef: true;
    blockId: string;
    name: string;
    requireEnrichments?: true | undefined;
  }> | undefined;
  seqCol: string;
  countCol: string;
  fullLengthCol: string;
  cdr1Col: string;
  cdr2Col: string;
  fr1Col: string;
  fr2Col: string;
  fr3Col: string;
  fr4Col: string;
  cdr3MinLength: number;
  cdr3MaxLength: number;
  filterCdr3Length: boolean;
  fullLengthMinLength: number;
  fullLengthMaxLength: number;
  filterFullLength: boolean;
  cdr1MinLength: number;
  cdr1MaxLength: number;
  cdr2MinLength: number;
  cdr2MaxLength: number;
  fr1MinLength: number;
  fr1MaxLength: number;
  fr2MinLength: number;
  fr2MaxLength: number;
  fr3MinLength: number;
  fr3MaxLength: number;
  fr4MinLength: number;
  fr4MaxLength: number;
  filterCdr1Length: boolean;
  filterCdr2Length: boolean;
  filterFr1Length: boolean;
  filterFr2Length: boolean;
  filterFr3Length: boolean;
  filterFr4Length: boolean;
  maxHd: number;
  minRatio: number;
  lowerCutoff: number;
}, _$_platforma_sdk_model0.InferOutputsFromLambdas<{
  inputOptions: _$_platforma_sdk_model0.ConfigRenderLambda<{
    readonly ref: {
      readonly __isRef: true;
      readonly blockId: string;
      readonly name: string;
      readonly requireEnrichments?: true | undefined | undefined;
    };
    readonly label: string;
  }[]>;
} & {
  isRunning: _$_platforma_sdk_model0.ConfigRenderLambda<boolean>;
} & {
  sequenceColumnOptions: _$_platforma_sdk_model0.ConfigRenderLambda<{
    value: string;
    label: string;
  }[]>;
} & {
  countColumnOptions: _$_platforma_sdk_model0.ConfigRenderLambda<{
    value: string;
    label: string;
  }[]>;
} & {
  pythonMessage: _$_platforma_sdk_model0.ConfigRenderLambda<string | undefined>;
} & {
  hasResult: _$_platforma_sdk_model0.ConfigRenderLambda<boolean>;
}>, "/", {}, _$_platforma_sdk_model0.BlockDefaultUiServices>>;
type BlockOutputs = InferOutputsType<typeof platforma>;
//#endregion
export { BlockData, BlockOutputs, platforma };
//# sourceMappingURL=index.d.ts.map