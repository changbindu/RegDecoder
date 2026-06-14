import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type { Register, DecodeResult, EncodeResult } from '@regdecoder/core';
import { parseValue, decode, encode, formatHex } from '@regdecoder/core';

export function useRegDecoder() {
  const selectedRegister = ref<Register | null>(null);
  const inputValue = ref<string>('');

  const parsedValue = computed<bigint | null>(() => {
    if (!inputValue.value.trim()) return null;
    try {
      return parseValue(inputValue.value);
    } catch {
      return null;
    }
  });

  const inputError = computed<string | null>(() => {
    if (!inputValue.value.trim()) return null;
    try {
      parseValue(inputValue.value);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid value';
    }
  });

  const decodeResult = computed<DecodeResult | null>(() => {
    const reg = selectedRegister.value;
    const val = parsedValue.value;
    if (!reg || val === null || val === undefined) return null;
    return decode(reg, val);
  });

  function selectRegister(register: Register) {
    selectedRegister.value = register;
    // Reset input when changing registers
    inputValue.value = '';
  }

  function flipBit(bitIndex: number) {
    const val = parsedValue.value;
    if (val === null || val === undefined || !selectedRegister.value) return;

    const result: EncodeResult = encode(val, bitIndex);
    // Update input with new hex value (padded to register width)
    inputValue.value = formatHex(result.newValue, selectedRegister.value.width);
  }

  return {
    selectedRegister,
    inputValue,
    parsedValue,
    decodeResult,
    inputError,
    selectRegister,
    flipBit,
  };
}
