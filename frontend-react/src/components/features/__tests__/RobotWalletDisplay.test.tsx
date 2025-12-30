import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { RobotWalletDisplay } from '../RobotWalletDisplay'

describe('RobotWalletDisplay', () => {
  const defaultProps = {
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    walletSource: 'privy_created' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders wallet address in truncated format by default', () => {
    render(<RobotWalletDisplay {...defaultProps} />)

    expect(screen.getByText('Wallet:')).toBeInTheDocument()
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument()
  })

  it('shows full address when showFullAddress is true', () => {
    render(<RobotWalletDisplay {...defaultProps} showFullAddress />)

    expect(screen.getByText(defaultProps.walletAddress)).toBeInTheDocument()
  })

  it('displays Privy badge for privy_created wallet', () => {
    render(<RobotWalletDisplay {...defaultProps} walletSource="privy_created" />)

    expect(screen.getByText('Privy')).toBeInTheDocument()
  })

  it('displays User badge for user_provided wallet', () => {
    render(<RobotWalletDisplay {...defaultProps} walletSource="user_provided" />)

    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('renders copy button', () => {
    render(<RobotWalletDisplay {...defaultProps} />)

    expect(screen.getByLabelText('Copy wallet address')).toBeInTheDocument()
  })

  it('shows edit button only for user_provided wallets with onWalletUpdate', () => {
    const onWalletUpdate = vi.fn()

    const { rerender } = render(
      <RobotWalletDisplay {...defaultProps} walletSource="privy_created" onWalletUpdate={onWalletUpdate} />
    )

    // Privy wallets should not have edit button
    expect(screen.queryByLabelText('Edit wallet address')).not.toBeInTheDocument()

    // User provided wallets should have edit button
    rerender(
      <RobotWalletDisplay {...defaultProps} walletSource="user_provided" onWalletUpdate={onWalletUpdate} />
    )

    expect(screen.getByLabelText('Edit wallet address')).toBeInTheDocument()
  })

  it('enters edit mode when clicking edit button', async () => {
    const user = userEvent.setup()
    const onWalletUpdate = vi.fn()

    render(
      <RobotWalletDisplay
        {...defaultProps}
        walletSource="user_provided"
        onWalletUpdate={onWalletUpdate}
      />
    )

    const editButton = screen.getByLabelText('Edit wallet address')
    await user.click(editButton)

    // Should show input field
    expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument()
    // Should show save and cancel buttons
    expect(screen.getByLabelText('Save wallet address')).toBeInTheDocument()
    expect(screen.getByLabelText('Cancel edit')).toBeInTheDocument()
  })

  it('calls onWalletUpdate when saving valid address', async () => {
    const user = userEvent.setup()
    const onWalletUpdate = vi.fn().mockResolvedValue(undefined)
    const newAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'

    render(
      <RobotWalletDisplay
        {...defaultProps}
        walletSource="user_provided"
        onWalletUpdate={onWalletUpdate}
      />
    )

    // Enter edit mode
    await user.click(screen.getByLabelText('Edit wallet address'))

    // Clear and type new address
    const input = screen.getByPlaceholderText('0x...')
    await user.clear(input)
    await user.type(input, newAddress)

    // Save
    await user.click(screen.getByLabelText('Save wallet address'))

    await waitFor(() => {
      expect(onWalletUpdate).toHaveBeenCalledWith(newAddress)
    })
  })

  it('does not call onWalletUpdate for invalid address', async () => {
    const user = userEvent.setup()
    const onWalletUpdate = vi.fn()

    render(
      <RobotWalletDisplay
        {...defaultProps}
        walletSource="user_provided"
        onWalletUpdate={onWalletUpdate}
      />
    )

    // Enter edit mode
    await user.click(screen.getByLabelText('Edit wallet address'))

    // Type invalid address
    const input = screen.getByPlaceholderText('0x...')
    await user.clear(input)
    await user.type(input, 'invalid-address')

    // Try to save
    await user.click(screen.getByLabelText('Save wallet address'))

    // Should not call onWalletUpdate
    expect(onWalletUpdate).not.toHaveBeenCalled()
  })

  it('cancels edit mode without saving', async () => {
    const user = userEvent.setup()
    const onWalletUpdate = vi.fn()

    render(
      <RobotWalletDisplay
        {...defaultProps}
        walletSource="user_provided"
        onWalletUpdate={onWalletUpdate}
      />
    )

    // Enter edit mode
    await user.click(screen.getByLabelText('Edit wallet address'))

    // Type something
    const input = screen.getByPlaceholderText('0x...')
    await user.type(input, 'test')

    // Cancel
    await user.click(screen.getByLabelText('Cancel edit'))

    // Should not call onWalletUpdate
    expect(onWalletUpdate).not.toHaveBeenCalled()
    // Should exit edit mode
    expect(screen.queryByPlaceholderText('0x...')).not.toBeInTheDocument()
    // Should show original address
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument()
  })
})
