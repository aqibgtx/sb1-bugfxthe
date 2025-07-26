"use client";

import { cn } from "@/lib/utils";
import { ButtonNew } from "@/components/ui/button-new";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, User, Crown } from "lucide-react";
import { useId, useState } from "react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'staff' | 'admin';
}

interface CustomerSelectProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

function CustomerSelect({
  customers,
  selectedCustomer,
  onCustomerSelect,
  placeholder = "Search customers by name, email, or phone...",
  label = "Select Customer",
  className
}: CustomerSelectProps) {
  const id = useId();
  const [open, setOpen] = useState<boolean>(false);

  const handleSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    onCustomerSelect(customer === selectedCustomer ? null : customer || null);
    setOpen(false);
  };

  const getDisplayText = () => {
    if (!selectedCustomer) return placeholder;
    return selectedCustomer.name;
  };

  const isVIP = (customer: Customer) => {
    return customer.role === 'staff' || customer.role === 'admin';
  };

  return (
    <div className={cn("space-y-2 min-w-[300px]", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <ButtonNew
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20"
          >
            <span className={cn("truncate", !selectedCustomer && "text-muted-foreground")}>
              {getDisplayText()}
            </span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className="shrink-0 text-muted-foreground/80"
              aria-hidden="true"
            />
          </ButtonNew>
        </PopoverTrigger>
        <PopoverContent
          className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search customers..." />
            <CommandList>
              <CommandEmpty>No customers found.</CommandEmpty>
              <CommandGroup>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.name} ${customer.email} ${customer.phone || ''}`}
                    onSelect={() => handleSelect(customer.id)}
                    className="flex items-center space-x-3 p-3"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-gray-900 font-medium truncate">{customer.name}</h4>
                          {isVIP(customer) && (
                            <div className="flex items-center space-x-1">
                              <Crown className="w-4 h-4 text-yellow-500" />
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold uppercase">
                                VIP
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-gray-600 text-sm space-y-1">
                          <p className="truncate">📧 {customer.email}</p>
                          {customer.phone && <p className="truncate">📱 {customer.phone}</p>}
                        </div>
                      </div>
                    </div>
                    {selectedCustomer?.id === customer.id && (
                      <Check size={16} strokeWidth={2} className="ml-auto text-blue-600" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { CustomerSelect };