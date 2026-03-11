# frozen_string_literal: true

module PostVisibilityFilters
  def unlocked_posts(items)
    Array(items).reject do |item|
      item.respond_to?(:data) && item.data['protected_by_folder_lock'] == true
    end
  end
end

Liquid::Template.register_filter(PostVisibilityFilters)
