import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { expensesApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import { BottomSheet, Button, OptionCards, TextField, useConfirm, useToast, type IconName } from '../../components/ui';
import type { ExpenseCategory } from '../../types/api.types';
import { expenseCategoryIcons, expenseCategoryLabels, formatCurrency, todayDateOnly } from '../../utils/format';

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Food', 'Fuel', 'VehicleRepair', 'Maintenance', 'Supplies', 'Other'];

interface ExpenseSheetProps {
  isVisible: boolean;
  /** Day the expense belongs to (YYYY-MM-DD). */
  expenseDate: string;
  onClose: () => void;
}

/** Records an expense during the day: food, fuel, flat tire, etc. */
export function ExpenseSheet({ isVisible, expenseDate, onClose }: ExpenseSheetProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Fuel');
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isVisible) {
      setExpenseCategory('Fuel');
      setAmountText('');
      setDescription('');
    }
  }, [isVisible]);

  const amount = Number(amountText.replace(/,/g, ''));
  const isAmountValid = Number.isFinite(amount) && amount >= 1;

  const createExpenseMutation = useMutation({
    mutationFn: () =>
      expensesApi.create({
        expenseCategory,
        amount: Math.round(amount * 100) / 100,
        description: description.trim() || undefined,
        expenseDate: expenseDate === todayDateOnly() ? undefined : expenseDate,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      showToast('Expense saved.');
      onClose();
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const handleSave = async () => {
    const isConfirmed = await confirm({
      title: 'Save this expense?',
      message: 'It will be counted in the totals of the day.',
      details: [
        { label: 'Category', value: expenseCategoryLabels[expenseCategory] },
        { label: 'Amount', value: formatCurrency(amount) },
        ...(description.trim() ? [{ label: 'Note', value: description.trim() }] : []),
      ],
      confirmLabel: 'Yes, save expense',
      icon: 'receipt',
    });
    if (isConfirmed) createExpenseMutation.mutate();
  };

  return (
    <BottomSheet
      isVisible={isVisible}
      title="Add expense"
      subtitle="Food, gasoline, flat tire and other costs of the day"
      onClose={onClose}
      footer={
        <Button
          label="Save expense"
          icon="checkmark"
          size="lg"
          fullWidth
          isDisabled={!isAmountValid}
          isLoading={createExpenseMutation.isPending}
          onPress={() => void handleSave()}
        />
      }
    >
      <OptionCards<ExpenseCategory>
        label="Category"
        columns={2}
        value={expenseCategory}
        onChange={setExpenseCategory}
        options={EXPENSE_CATEGORIES.map((category) => ({
          value: category,
          title: expenseCategoryLabels[category],
          icon: expenseCategoryIcons[category] as IconName,
        }))}
      />
      <TextField
        label="Amount"
        isRequired
        prefix="₱"
        keyboardType="decimal-pad"
        placeholder="0.00"
        value={amountText}
        onChangeText={(text) => setAmountText(text.replace(/[^0-9.]/g, ''))}
        errorText={amountText && !isAmountValid ? 'Enter an amount of at least ₱1.' : null}
      />
      <TextField
        label="Note (optional)"
        placeholder="e.g. Gasoline 2 liters, vulcanize flat tire"
        value={description}
        onChangeText={setDescription}
        maxLength={255}
      />
    </BottomSheet>
  );
}
