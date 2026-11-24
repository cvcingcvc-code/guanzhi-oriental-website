import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { InquiryDialog } from './InquiryDialog';

function Harness() {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  return <><button onClick={(event) => { setTrigger(event.currentTarget); setOpen(true); }}>Open</button><InquiryDialog locale="en" email="hello@example.com" open={open} onClose={() => setOpen(false)} returnFocus={trigger} /></>;
}

describe('InquiryDialog accessibility', () => {
  it('moves focus in, traps it, closes with Escape and restores focus', async () => {
    const user = userEvent.setup(); render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' }); await user.click(trigger);
    const close = screen.getAllByRole('button', { name: 'Close partnership inquiry' })[1]!;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: /Send inquiry/ })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });
});

describe('InquiryDialog validation', () => {
  it('validates fields on blur and on submit', async () => {
    const user = userEvent.setup();
    render(<InquiryDialog locale="zh-CN" email="hello@example.com" open={true} onClose={() => {}} returnFocus={null} />);

    // 1. 测试单字段 blur 验证
    const nameInput = screen.getByPlaceholderText('姓名');
    await user.type(nameInput, 'A');
    await user.tab(); // 触发 blur
    expect(screen.getByText('姓名至少 2 个字符，不超过 80 个。')).toBeInTheDocument();

    // 2. 测试输入合规后错误清除
    await user.type(nameInput, 'BC');
    expect(screen.queryByText('姓名至少 2 个字符，不超过 80 个。')).not.toBeInTheDocument();

    // 3. 测试空表单直接点击提交触发全部必填项校验
    const submitBtn = screen.getByRole('button', { name: /提交合作意向/ });
    await user.click(submitBtn);

    expect(screen.getByText('机构名称至少 2 个字符，不超过 160 个。')).toBeInTheDocument();
    expect(screen.getByText('请输入有效的邮箱地址。')).toBeInTheDocument();
    expect(screen.getByText('请至少用 6 个字符说明合作需求。')).toBeInTheDocument();
  });
});
